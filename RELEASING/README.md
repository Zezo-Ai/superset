<!--
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.
-->

# Apache Releases

Until things settle and we create scripts that streamline this,
you'll probably want to run these commands manually and understand what
they do prior to doing so.

For coordinating on releases, on operational topics that require more
synchronous communications, we recommend using the release channel
on the Superset Slack. People crafting releases and those interested in
partaking in the process should join the channel.

## Release setup (First Time Only)

First you need to setup a few things. This is a one-off and doesn't
need to be done at every release.

```bash
    # Create PGP Key, and use your @apache.org email address
    gpg --gen-key

    # Checkout ASF dist repo

    svn checkout https://dist.apache.org/repos/dist/dev/superset/ ~/svn/superset_dev

    svn checkout https://dist.apache.org/repos/dist/release/superset/ ~/svn/superset
    cd ~/svn/superset


    # Add your GPG pub key to KEYS file. Replace "Maxime Beauchemin" with your name
    export SUPERSET_PGP_FULLNAME="Maxime Beauchemin"
    (gpg --list-sigs "${SUPERSET_PGP_FULLNAME}" && gpg --armor --export "${SUPERSET_PGP_FULLNAME}" ) >> KEYS


    # Commit the changes
    svn commit -m "Add PGP keys of new Superset committer"

    # push the changes
    svn update
```

To minimize the risk of mixing up your local development environment, it's recommended to work on the
release in a different directory than where the devenv is located. In this example, we'll clone
the repo directly from the main `apache/superset` repo to a new directory `superset-release`:

```bash
cd <MY PROJECTS PATH>
git clone https://github.com/apache/superset.git superset-release
cd superset-release
```

We recommend setting up a virtual environment to isolate the python dependencies from your main
setup:

```bash
virtualenv venv
source venv/bin/activate
```

In addition, we recommend using the [`cherrytree`](https://pypi.org/project/cherrytree/) tool for
automating cherry picking, as it will help speed up the release process. To install `cherrytree`
and other dependencies that are required for the release process, run the following commands:

```bash
pip install -r RELEASING/requirements.txt
```

## Setting up the release environment (do every time)

As the vote process takes a minimum of 72h, sometimes stretching over several weeks
of calendar time if votes don't pass, chances are
the same terminal session won't be used for crafting the release candidate and the
final release. Therefore, it's a good idea to do the following every time you
work on a new phase of the release process to make sure you aren't releasing
the wrong files/using wrong names. There's a script to help you set correctly all the
necessary environment variables. Change your current directory to `RELEASING`
and execute the `set_release_env.sh` script with the relevant parameters:

Usage (MacOS/ZSH):

```bash
cd RELEASING
source set_release_env.sh <SUPERSET_RC_VERSION> <PGP_KEY_FULLNAME>
```

Usage (BASH):

```bash
. set_release_env.sh <SUPERSET_RC_VERSION> <PGP_KEY_FULLNAME>
```

Example:

```bash
source set_release_env.sh 1.5.1rc1 myid@apache.org
```

The script will output the exported variables. Here's example for 1.5.1rc1:

```env
-------------------------------
Set Release env variables
SUPERSET_VERSION=1.5.1
SUPERSET_RC=1
SUPERSET_GITHUB_BRANCH=1.5
SUPERSET_PGP_FULLNAME=villebro@apache.org
SUPERSET_VERSION_RC=1.5.1rc1
SUPERSET_RELEASE=apache_superset-1.5.1
SUPERSET_RELEASE_RC=apache_superset-1.5.1rc1
SUPERSET_RELEASE_TARBALL=apache_superset-1.5.1-source.tar.gz
SUPERSET_RELEASE_RC_TARBALL=apache_superset-1.5.1rc1-source.tar.gz
SUPERSET_TMP_ASF_SITE_PATH=/tmp/incubator-superset-site-1.5.1
-------------------------------
```

## Crafting a source release

When crafting a new minor or major release we create
a branch named with the release MAJOR.MINOR version (on this example 0.37).
This new branch will hold all PATCH and release candidates
that belong to the MAJOR.MINOR version.

### Creating an initial minor release (e.g. 1.5.0)

The MAJOR.MINOR branch is normally a "cut" from a specific point in time from the master branch.
When creating the initial minor release (e.g. 1.5.0), create a new branch:

```bash
git checkout master
git pull
git checkout -b ${SUPERSET_GITHUB_BRANCH}
git push origin $SUPERSET_GITHUB_BRANCH
```

Note that this initializes a new "release cut", and is NOT needed when creating a patch release
(e.g. 1.5.1).

### Creating a patch release (e.g. 1.5.1)

When getting ready to bake a patch release, simply checkout the relevant branch:

```bash
git checkout master
git pull
git checkout ${SUPERSET_GITHUB_BRANCH}
```

### Cherry picking

It is customary to label PRs that have been introduced after the cut with the label
`v<MAJOR>.<MINOR>`. For example, for any PRs that should be included in the 1.5 branch, the
label `v1.5` should be added.

To see how well the labelled PRs would apply to the current branch, run the following command:

```bash
cherrytree bake -r apache/superset -m master -l v${SUPERSET_GITHUB_BRANCH} ${SUPERSET_GITHUB_BRANCH}
```

This requires the presence of an environment variable `GITHUB_TOKEN`. Alternatively,
you can pass the token directly via the `--access-token` parameter (`-at` for short).

#### Happy path: no conflicts

This will show how many cherries will apply cleanly. If there are no conflicts, you can simply apply all cherries
by adding the `--no-dry-run` flag (`-nd` for short):

```bash
cherrytree bake -r apache/superset -m master -l v${SUPERSET_GITHUB_BRANCH} -nd ${SUPERSET_GITHUB_BRANCH}
```

#### Resolving conflicts

If there are conflicts, you can issue the following command to apply all cherries up until the conflict automatically, and then
break by adding the `-error-mode break` flag (`-e break` for short):

```bash
cherrytree bake -r apache/superset -m master -l v${SUPERSET_GITHUB_BRANCH} -nd -e break ${SUPERSET_GITHUB_BRANCH}
```

After applying the cleanly merged cherries, `cherrytree` will specify the SHA of the conflicted cherry. To resolve the conflict,
simply issue the following command:

```bash
git cherry-pick <SHA>
```

Then fix all conflicts, followed by

```bash
git add -u  # add all changes
git cherry-pick --continue
```

After this, rerun all the above steps until all cherries have been picked, finally pushing all new commits to the release branch
on the main repo:

```bash
git push
```

### Updating changelog

Next, update the `CHANGELOG/<version>.md` with all the changes that are included in the release.
Make sure the branch has been pushed to `origin` to ensure the changelog generator
can pick up changes since the previous release.
Similar to `cherrytree`, the change log script requires a github token, either as an env var
(`GITHUB_TOKEN`) or as the parameter `--access_token`.

#### Initial release (e.g. 1.5.0)

When generating the changelog for an initial minor release, you should compare with
the previous release (in the example, the previous release branch is `1.4`, so remember to
update it accordingly):

```bash
python changelog.py --previous_version 1.4 --current_version ${SUPERSET_GITHUB_BRANCH} changelog
```

You can get a list of pull requests with labels started with blocking, risk, hold, revert and security by using the parameter `--risk`.
Example:

```bash
python changelog.py --previous_version 0.37 --current_version 0.38 changelog --access_token {GITHUB_TOKEN} --risk
```

The script will checkout both branches, compare all the PRs, and output the lines that are needed to be added to the
`CHANGELOG/<version>.md` file in the root of the repo. Remember to also make sure to update the branch id (with the above command
`1.5` needs to be changed to `1.5.0`)

Then, in `UPDATING.md`, a file that contains a list of notifications around
deprecations and upgrading-related topics,
make sure to move the content now under the `Next Version` section under a new
section for the new release.

#### Patch release (e.g. 1.5.1)

To compare the forthcoming patch release with the latest release from the same branch, set
`--previous_version` as the tag of the previous release (in this example `1.5.0`; remember to update accordingly)

```bash
python changelog.py --previous_version 1.5.0 --current_version ${SUPERSET_GITHUB_BRANCH} changelog
```

### Set version number

Finally, bump the version number on `superset-frontend/package.json` (replace with whichever version is being released excluding the RC version):

```json
"version": "0.38.0"
```

Commit the change with the version number, then git tag the version with the release candidate and push to the branch:

```bash
# add changed files and commit
git add ...
git commit ...
# push new tag
git tag ${SUPERSET_VERSION_RC}
git push origin ${SUPERSET_VERSION_RC}
```

## Preparing the release candidate

The first step of preparing an Apache Release is packaging a release candidate
to be voted on. Make sure you have correctly prepared and tagged the ready to ship
release on Superset's repo (MAJOR.MINOR branch), the following script will clone
the tag and create a signed source tarball from it:

```bash
# make_tarball will use the previously set environment variables
# you can override by passing arguments: make_tarball.sh <SUPERSET_VERSION> <SUPERSET_VERSION_RC> "<PGP_KEY_FULLNAME>"
./make_tarball.sh
```

Note that `make_tarball.sh`:

- By default, the script assumes you have already executed an SVN checkout to `$HOME/svn/superset_dev`.
  This can be overridden by setting `SUPERSET_SVN_DEV_PATH` environment var to a different svn dev directory
- Will refuse to craft a new release candidate if a release already exists on your local svn dev directory
- Will check `package.json` version number and fails if it's not correctly set

### Build and test the created source tarball

To build and run the **local copy** of the recently created tarball:

```bash
# Build and run a release candidate tarball
./test_run_tarball.sh local
# you should be able to access localhost:5001 on your browser
# login using admin/admin
```

### Shipping to SVN

Now let's ship this RC into svn's dev folder

```bash
cd ~/svn/superset_dev/
svn add ${SUPERSET_VERSION_RC}
svn commit -m "Release ${SUPERSET_VERSION_RC}"
svn update
```

### Build and test from SVN source tarball

To build and run the recently created tarball **from SVN**:

```bash
# Build and run a release candidate tarball
./test_run_tarball.sh
# you should be able to access localhost:5001 on your browser
# login using admin/admin
```

## Create a release on GitHub

After submitting the tag and testing the release candidate, follow the steps [here](https://docs.github.com/en/repositories/releasing-projects-on-github/managing-releases-in-a-repository) to create the release on GitHub. Use the vote email text as the content for the release description. Make sure to check the "This is a pre-release" checkbox for release candidates. You can check previous releases if you need an example.

## Voting

Now you're ready to start the [VOTE] thread. Here's an example of a
previous release vote thread:
https://lists.apache.org/thread.html/e60f080ebdda26896214f7d3d5be1ccadfab95d48fbe813252762879@<dev.superset.apache.org>

To easily send a voting request to Superset community, still on the `superset/RELEASING` directory:

```bash
# Note: use Superset's virtualenv
(venv)$ python generate_email.py vote_pmc
```

The script will generate the email text that should be sent to dev@superset.apache.org using an email client. The release version and release candidate number are fetched from the previously set environment variables.

Once 3+ binding votes (by PMC members) have been cast and at
least 72 hours have past, you can post a [RESULT] thread:
https://lists.apache.org/thread.html/50a6b134d66b86b237d5d7bc89df1b567246d125a71394d78b45f9a8@%3Cdev.superset.apache.org%3E

To easily send the result email, still on the `superset/RELEASING` directory:

```bash
# Note: use Superset's virtualenv
python generate_email.py result_pmc
```

The script will interactively ask for extra information needed to fill out the email template. Based on the
voting description, it will generate a passing, non passing or non conclusive email.
Here's an example:

```text
A List of people with +1 binding vote (ex: Max,Grace,Krist): Daniel,Alan,Max,Grace
A List of people with +1 non binding vote (ex: Ville): Ville
A List of people with -1 vote (ex: John):
```

The script will generate the email text that should be sent to dev@superset.apache.org using an email client. The release version and release candidate number are fetched from the previously set environment variables.

## Validating a release

Official instructions:
https://www.apache.org/info/verification.html

We now have a handy script for anyone validating a release to use. The core of it is in this very folder, `verify_release.py`. Just make sure you have all three release files in the same directory (`{some version}.tar.gz`, `{some version}.tar.gz.asc` and `{some version}tar.gz.sha512`). Then you can pass this script the path to the `.gz` file like so:
`python verify_release.py ~/path/tp/apache_superset-{version/candidate}-source.tar.gz`

If all goes well, you will see this result in your terminal:

```bash
SHA-512 verified
RSA key verified
```

There are also additional support scripts leveraging this to make it easy for those downloading a release to test it in-situ. You can do either of the following to validate these release assets:

- `cd` into `superset-frontend` and run `npm run validate-release`
- `cd` into `RELEASES` and run `./validate_this_release.sh`

## Publishing a successful release

Upon a successful vote, you'll have to copy the folder into the non-"dev/" folder.

```bash
cp -r ~/svn/superset_dev/${SUPERSET_VERSION_RC}/ ~/svn/superset/${SUPERSET_VERSION}/
cd ~/svn/superset/
# Rename the RC (0.34.1rc1) to the actual version being released (0.34.1)
for f in ${SUPERSET_VERSION}/*; do mv "$f" "${f/${SUPERSET_VERSION_RC}/${SUPERSET_VERSION}}"; done
svn add ${SUPERSET_VERSION}
svn commit -m "Release ${SUPERSET_VERSION}"
svn update
```

Then tag the final release:

```bash
# Go to the root directory of the repo, e.g. `~/src/superset`
cd ~/src/superset/
# make sure you're on the correct branch (e.g. 0.34)
git branch
# Create the release tag
git tag -f ${SUPERSET_VERSION}
# push the tag to the remote
git push origin ${SUPERSET_VERSION}
```

### Publishing a Convenience Release to PyPI

Extract the release to the `/tmp` folder to build the PiPY release. Files in the `/tmp` folder will be automatically deleted by the OS.

```bash
mkdir -p /tmp/superset && cd /tmp/superset
tar xfvz ~/svn/superset/${SUPERSET_VERSION}/${SUPERSET_RELEASE_TARBALL}
```

Create a virtual environment and install the dependencies

```bash
cd ${SUPERSET_RELEASE_RC}
python3 -m venv venv
source venv/bin/activate
pip install -r requirements/base.txt
pip install build twine
```

Create the distribution

```bash
cd superset-frontend/
npm ci && npm run build
# Compile translations for the frontend
npm run build-translation

cd ../


# Compile translations for the backend
./scripts/translations/generate_mo_files.sh

# update build version number
sed -i '' "s/version_string = .*/version_string = \"$SUPERSET_VERSION\"/" setup.py

# build the python distribution
python setup.py sdist
```

Publish to PyPI

You may need to ask a fellow committer to grant
you access to it if you don't have access already. Make sure to create
an account first if you don't have one, and reference your username
while requesting access to push packages.

```bash
twine upload dist/*
```

Set your username to `__token__`

Set your password to the token value, including the `pypi-` prefix

More information on https://pypi.org/help/#apitoken

### Announcing

Once it's all done, an [ANNOUNCE] thread announcing the release to the dev@ mailing list is the final step.

```bash
# Note use Superset's virtualenv
python generate_email.py announce
```

The script will generate the email text that should be sent to dev@superset.apache.org using an email client. The release version is fetched from the previously set environment variables.

### GitHub Release

Finally, so the GitHub UI reflects the latest release, you should create a release from the
tag corresponding with the new version. Go to https://github.com/apache/superset/tags,
click the 3-dot icon and select `Create Release`, paste the content of the ANNOUNCE thread in the
release notes, and publish the new release.

At this point, a GitHub action will run that will check whether this release's version number is higher than the current 'latest' release. If that condition is true, this release sha will automatically be tagged as `latest` so that the most recent release can be referenced simply by using the 'latest' tag instead of looking up the version number. The existing version number tag will still exist, and can also be used for reference.

### Update Superset files

Now that we have a final Apache release we need to open a pull request on Superset with the changes on [CHANGELOG/\<version\>.md](../CHANGELOG) and [UPDATING.md](../UPDATING.md).

We also need to update the Environment section of [ISSUE_TEMPLATE/bug-report.yml](../.github/ISSUE_TEMPLATE//bug-report.yml) to reflect the new release changes. This includes removing versions that are not supported anymore and adding new ones.

### Docker Releases

Docker release with proper tags should happen automatically as version
tags get pushed to the `apache/superset` GitHub repository through this
[GitHub action](https://github.com/apache/superset/blob/master/.github/workflows/docker.yml)

Note that this GH action implements a `workflow_dispatch` trigger,
meaning that it can be triggered manually from the GitHub UI. If anything
was to go wrong in the automated process, it's possible to re-generate
and re-push the proper images and tags through this interface. The action
takes the version (ie `3.1.1`), the git reference (any SHA, tag or branch
reference), and whether to force the `latest` Docker tag on the
generated images.

### Npm Release

You might want to publish the latest @superset-ui release to npm

```bash
cd superset/superset-frontend
```

An automated GitHub action will run and generate a new tag, which will contain a version number provided as a parameter.

```bash
export GH_TOKEN={GITHUB_TOKEN}
npx lerna version {VERSION} --conventional-commits --create-release github --no-private --yes --message {COMMIT_MESSAGE}
```

This action will publish the specified version to npm registry.

```bash
npx lerna publish from-package --yes
```
