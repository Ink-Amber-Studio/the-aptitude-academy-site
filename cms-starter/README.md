# The Aptitude Academy CMS starter

This folder holds the local Decap workspace and content fixtures. Only `content/posts/` and `media/uploads/` belong in the private `Ink-Amber-Studio/the-aptitude-academy-content` repository. The admin code/config and OAuth Worker remain studio-controlled. Nothing has been pushed while the isolated publishing route is incomplete.

- `admin/` is Kiara's future Decap CMS workspace. It has a brand-matched wrapper and a short Help page at `/admin/help/` (locally `/cms/help/`), using Decap's documented custom mount element instead of modifying Decap's controls.
- `content/posts/` holds blog posts authored through the CMS.
- `media/uploads/` holds blog images only; it must never contain learner information or CVs.

`admin/config.yml` currently uses Decap's safe `test-repo` backend for local interface testing. The browser preview is available locally at `/cms/`; it does not authenticate or write to GitHub. `npm run package:public` derives a GitHub-backed production config in a fresh `output/public-<timestamp>-<pid>/admin/config.yml` snapshot without storing the OAuth secret locally. It includes the branded editor wrapper and Help page. `output/latest-public.txt` names the latest complete snapshot. This is a local package only, not a deployment.

`auth-worker/` is the reviewed source for the live dedicated Cloudflare Worker at `https://taa-decap-auth.keethan.workers.dev`. It remains studio-controlled and must **not** be copied to Kiara's content repository. Both GitHub OAuth credentials are encrypted Worker secrets; no value is stored in this project or the content repository.
