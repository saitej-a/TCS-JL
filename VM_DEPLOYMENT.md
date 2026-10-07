# Deploying to a VM with GitHub Actions

The `main` branch deploys automatically after the existing lint and test jobs
pass. The runner transfers the checked-out application files over SSH and runs
`docker compose -f docker-compose.prod.yml up -d --build` in the VM deployment
directory.

## GitHub Actions configuration

In the repository's **Settings → Secrets and variables → Actions**, add:

| Name | Type | Value |
| --- | --- | --- |
| `VM_HOST` | Variable | VM's public DNS name or IP address |
| `VM_USER` | Variable | SSH account used for deployment |
| `VM_SSH_PORT` | Variable | SSH port; optional, defaults to `22` |
| `VM_DEPLOY_PATH` | Variable | Absolute deployment directory, e.g. `/opt/tcs-jl` |
| `VM_SSH_PRIVATE_KEY` | Secret | Private key for the deploy account |
| `VM_KNOWN_HOSTS` | Secret | Verified SSH host-key line(s) for the VM |

Install the matching public key in the VM account's `~/.ssh/authorized_keys`.
Populate `VM_KNOWN_HOSTS` with the VM's host-key line from `ssh-keyscan` (use
`[host]:port` format for a non-default port), after verifying its fingerprint
through a trusted VM console or administrator. The workflow enforces strict
host-key checking and does not trust an unverified key discovered during a
deployment.

## Prepare the VM

Install Docker Engine with the Docker Compose plugin, `rsync`, and SSH. Create
the deployment directory and ensure the SSH account can write to it and run
Docker Compose. Before the first push, place the production-only files in that
directory:

- `.env.prod`
- `secrets/firebase-service-account.json`
- `nginx/certs/server.crt` and `nginx/certs/server.key`

These files are deliberately excluded from transfer; the workflow does not
upload repository environment files, secrets, or local TLS certificates, and
does not delete files already on the VM. Keep production values only on the VM
and in GitHub Actions secrets/variables as appropriate.
