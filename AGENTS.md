# Agent Instructions

- Always deploy builds to the `docs` directory (use the `npm run deploy` script) so the documentation site stays updated.
- **DO NOT TOUCH THE MAIN BRANCH**. Work on feature branches and do not merge to main.
- Always run unit tests.
- Always increase the build number during deploy.
- When bumping the build number, also write the build metadata to the Firebase database using the built-in build bot credentials (no environment overrides needed).
- Always deploy at the end of the task.
- Build metadata sync authenticates with the baked-in build bot identity (`builtbot@shopping-spree.bot`, UID `f1Csbq9tI1gqg0mZ7IVSiVFpTWx1`) using the derived password (local-part of the email); no environment overrides are needed.
