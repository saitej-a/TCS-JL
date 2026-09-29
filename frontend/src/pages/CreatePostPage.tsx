/**
 * The former §7.7 create-post page, now a redirect shim (Phase 12 D-03):
 * posting is a dialog on the feed, so `/community/create` navigates to
 * `/community` with the modal opened (hand-off via location state — a plain
 * redirect cannot open a dialog on the target by itself). Direct visits to
 * the old URL land on the feed with the modal open; no orphan page remains.
 *
 * All former page contracts (client validation, scam/duplicate copy, identity
 * preview) moved verbatim into `CreatePostModal`.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function CreatePostPage(): null {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/community", { replace: true, state: { createOpen: true } });
  }, [navigate]);

  return null;
}
