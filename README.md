# The Aptitude Academy website

This private repository is the protected source for the static TAA website and its cPanel publishing route. It deliberately contains no hosting credential, client record, CV, enquiry or OAuth secret.

## Everyday release workflow

1. Make and review website changes locally with `npm start`.
2. Run `npm run package:public` for a locally reviewable, noindex package, or `npm run package:launch` for the crawlable release equivalent.
3. When the review is complete, commit and push to `main`. GitHub Actions validates the build and, once the restricted publisher is enabled, mirrors only the generated public output to cPanel.

The branded Decap editor writes blog content to the separate private `the-aptitude-academy-content` repository. The protected publisher checks that repository every 15 minutes and deploys only its published `main` content. This keeps deployment credentials outside the editor-writable repository.

Do not edit files in cPanel directly: the next protected release would replace them. Do not add secrets to this repository or to the content repository.
