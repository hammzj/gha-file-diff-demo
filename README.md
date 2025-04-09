# gha-file-diff-demo

This is a demo repository of comparing keys changed in encrypted .env files without revealing sensitive information. It
is using GitHub Workflow + custom JavaScript.

See blog post
here: https://dev.to/hammzj/compare-changes-to-encrypted-files-without-revealing-secrets-in-a-github-actions-pull-request-4kij

## Installation

* Install the project:

```
npm ci
```

* Assign a value to `DOTENVENC_PASS` to use for encryption and decryption
  using [dotenvenc](https://github.com/tka85/dotenvenc). Save this somewhere securely,
  and [save it as a repository secret](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)!
  * `DOTENVENC_PASS=%superS3curePa$sword*&`

* _Optional: if there are any keys you don't want displayed, add a repository secret with a comma-delimited set of keys and name it `DOTENV_SENSITIVE_KEYS`_
  * For example, `DOTENV_SENSITIVE_KEYS=ADMIN_USERNAME,ADMIN_PASSWORD,API_KEY` 

* To test it out, create a `.env` file and add values to it:

```
DB_PASS=my-OG-password
SECRET_TOKEN=noMoreSecrets
ANOTHER_TOKEN=foo
```

* Encrypt it with `npm run encrypt` and commit the `.env.enc` file to your branch.

* On a new branch, edit the `.env` file, encrypt it, and commit it to the new branch.

```
DB_PASS=my-updated-password
SECRET_TOKEN=noMoreSecrets
ADMIN_USERNAME=admin
ADMIN_PASSWORD=hello-w0rld!
MY_NEW_KEY=abcd1234~
```

* Open a pull request and the GitHub workflow for `diff-env-files.yml` should run!


## Note
For this repository, the `DOTENVENC_PASS=%special-ocular-remittance-session-0407*`
