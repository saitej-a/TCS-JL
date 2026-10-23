"""Branch closure — Phase 11 D-04/D-05 (migration 0003 + backfill).

`Comment.branch_closed_by` names the removed ancestor responsible for a node's
closure (null = open). Existing rows predate the column, so this migration
backfills it with the same semantics the service maintains going forward:

* for every soft-deleted comment, each of its descendants that has **no nearer
  removed ancestor** is stamped with that comment (nearest-closer wins — a node
  under two removed ancestors names the closer one, which is exactly the
  comparison `services.restore_comment` relies on);
* nodes already naming a closer are left alone (idempotent under re-runs).

The backfill is a plain per-row loop on purpose: it runs once over the data that
exists today (small — this is a pre-launch project), correctness beats
cleverness, and the parity between this loop and `soft_delete_comment`'s runtime
marking is pinned by
`test_branch_closure.py::test_backfill_matches_the_service_semantics`.
"""

from django.db import migrations, models


def _load_graph(comment_model):
    parents = {row["id"]: row["parent_id"] for row in comment_model.objects.values("id", "parent_id")}
    deleted_ids = {row["id"] for row in comment_model.objects.filter(is_deleted=True).values("id")}
    children = {}
    for child_id, parent_id in parents.items():
        if parent_id is not None:
            children.setdefault(parent_id, []).append(child_id)
    return parents, deleted_ids, children


def backfill_branch_closed_by(apps, schema_editor):
    """Stamp every descendant of every removed comment with its nearest closer."""
    Comment = apps.get_model("community", "Comment")
    parents, deleted_ids, children = _load_graph(Comment)

    def descendants(root_id):
        """BFS over the child map; parents precede children by construction."""
        frontier, found = [root_id], []
        while frontier:
            batch = children.get(frontier.pop(0), [])
            found.extend(batch)
            frontier.extend(batch)
        return found

    for removed_id in deleted_ids:
        for descendant_id in descendants(removed_id):
            # Nearest-closer: walk up from the node's parent; the walk stops at
            # the first removed ancestor — and `removed_id` itself is excluded
            # from the chain above the node, so "nearer" is strictly between the
            # node and `removed_id`. Any nearer removed ancestor names this node
            # itself (when the loop reaches that ancestor), so skip here.
            node_parent = parents.get(descendant_id)
            nearer_removed = False
            while node_parent is not None and node_parent != removed_id:
                if node_parent in deleted_ids:
                    nearer_removed = True
                    break
                node_parent = parents.get(node_parent)
            if nearer_removed:
                continue
            Comment.objects.filter(id=descendant_id, branch_closed_by__isnull=True).update(
                branch_closed_by=removed_id
            )


def unbackfill_branch_closed_by(apps, schema_editor):
    """Reverse of the data migration: clear what the backfill set."""
    Comment = apps.get_model("community", "Comment")
    Comment.objects.filter(branch_closed_by__isnull=False).update(branch_closed_by=None)


class Migration(migrations.Migration):

    dependencies = [
        ("community", "0002_announcement"),
    ]

    operations = [
        migrations.AddField(
            model_name="comment",
            name="branch_closed_by",
            field=models.ForeignKey(
                blank=True,
                help_text="The removed ancestor responsible for closing this node's branch.",
                null=True,
                on_delete=models.SET_NULL,
                related_name="branch_closed_descendants",
                to="community.comment",
            ),
        ),
        migrations.RunPython(backfill_branch_closed_by, unbackfill_branch_closed_by),
    ]
