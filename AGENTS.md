# Agent Instructions

- Always deploy builds to the `docs` directory (use the `npm run deploy` script) so the documentation site stays updated.
- **DO NOT TOUCH THE MAIN BRANCH**. Work on feature branches and do not merge to main.
- Always run unit tests.
- Always increase the build number during deploy.
- Build metadata is written from the PWA after sign-in; the bump script only updates the local manifest.
- Always deploy at the end of the task.
