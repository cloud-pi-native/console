# Changelog

## [3.2.0](https://github.com/dnum-mi/dso-console/compare/v3.1.0...v3.2.0) (2023-05-05)


### Features

* :lipstick: better ui for permission form ([56e0739](https://github.com/dnum-mi/dso-console/commit/56e0739d935d96c4eedd55807151f72f8fafcb6b))
* :sparkles: add description field for a project ([e9d65ed](https://github.com/dnum-mi/dso-console/commit/e9d65eda3084ac46b48f8e7a4a7e78324cf8d351))
* :sparkles: add download link for includes.zip ([0e067d1](https://github.com/dnum-mi/dso-console/commit/0e067d1965e39084d3f21191e27aa3b82948df17))
* :sparkles: introduce users admin view ([34ffbf7](https://github.com/dnum-mi/dso-console/commit/34ffbf735c6d5e103a3814a0cd739242efc77240))


### Bug Fixes

* :alien: refacto plugins to check services before save in database ([c58f3da](https://github.com/dnum-mi/dso-console/commit/c58f3dab057fd39f62e20ca3951278a87f6cfad0))
* :bug: forget default value for log table ([ade449b](https://github.com/dnum-mi/dso-console/commit/ade449b0a834f850d4f64c94cfb489174b946463))
* :construction: fix e2e test admin (temporary) ([34ffbf7](https://github.com/dnum-mi/dso-console/commit/34ffbf735c6d5e103a3814a0cd739242efc77240))
* :construction: use ingress ([621d5ee](https://github.com/dnum-mi/dso-console/commit/621d5eee80adfb5f14459b93c7f51b431dd61c31))
* :fire: remove routes ([65dabcb](https://github.com/dnum-mi/dso-console/commit/65dabcb28f8ede298975a2cec3e7ff5623ee4d8c))
* :loud_sound: log database sync error ([3e73dac](https://github.com/dnum-mi/dso-console/commit/3e73dac0fc470051c5aaf410ebbbf28cafc9ee0e))
* :wrench: update helm values ([16d3223](https://github.com/dnum-mi/dso-console/commit/16d32233c84001b8aa206a76b8ac3b772875cb64))


### Performance Improvements

* :art: admin users no custom exception ([34ffbf7](https://github.com/dnum-mi/dso-console/commit/34ffbf735c6d5e103a3814a0cd739242efc77240))

## [3.1.0](https://github.com/dnum-mi/dso-console/compare/v3.0.0...v3.1.0) (2023-04-18)


### Features

* :children_crossing: add deployment infos below environment tiles ([992b34e](https://github.com/dnum-mi/dso-console/commit/992b34e070401ae330cab239d73bf27b56ba516c))
* :sparkles: add custom ca to server ([8583577](https://github.com/dnum-mi/dso-console/commit/85835775d1bf21dfadffe5094dc1a513d6782525))
* :sparkles: introduce environment management page ([3e77a67](https://github.com/dnum-mi/dso-console/commit/3e77a679446853b981d9bf98f1bd62795ce5cf1d))


### Bug Fixes

* :bug: fix git output url ([e3402b4](https://github.com/dnum-mi/dso-console/commit/e3402b44dddbd71805293305df181321af04dafe))
* :bug: forget delete mirror repository secret ([f00aac7](https://github.com/dnum-mi/dso-console/commit/f00aac7f6315a1f27ee05ebaa6863feb466ac654))

## [3.0.0](https://github.com/dnum-mi/dso-console/compare/v2.3.0...v3.0.0) (2023-04-14)


### ⚠ BREAKING CHANGES

* **api:** :building_construction: replace ansible with plugins

### Features

* :art: load kubeconfig only if if a path is set ([a9d9338](https://github.com/dnum-mi/dso-console/commit/a9d93387cc7ff407ea71edb848e664fb651fc09a))
* :bento: add Marianne police ([c5af057](https://github.com/dnum-mi/dso-console/commit/c5af05774332d97fc5b669aeaa60f9fca6075998))
* :boom: change helm deployment ([c1368c6](https://github.com/dnum-mi/dso-console/commit/c1368c69de93357c66709110f3c57d22a62af8ad))
* :bug: pass correct args to createDsoProject ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :card_file_box: save gitlab and registry id in db ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :construction: bug in keycloak env deletion ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :construction: integration updateRepo gitlab ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :construction: vault get registry logins ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :lipstick: add dark theme ([cfc16d8](https://github.com/dnum-mi/dso-console/commit/cfc16d81391c28447d02297a9ebdf22c1f142c6f))
* :lipstick: add dark theme ([cfc16d8](https://github.com/dnum-mi/dso-console/commit/cfc16d81391c28447d02297a9ebdf22c1f142c6f))
* :loud_sound: add a short description for database logging ([4146f5a](https://github.com/dnum-mi/dso-console/commit/4146f5ae7048fa280a654b5471a32968af159b2f))
* :recycle: find lasts commented code ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :recycle: review Arnaud ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :spakles: kube ns and secret ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :sparkles: add infra repositories query ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :sparkles: add private repo handling ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :sparkles: add tmp environment management ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :sparkles: add vault keys for repo creation ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :sparkles: argo plugin ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :sparkles: introduce plugin manager ([06bc24c](https://github.com/dnum-mi/dso-console/commit/06bc24ce75820e38700aeaa26de15463021487b0))
* :sparkles: vault plugin ! ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :speech_balloon: add conventional commit for first mirror ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :technologist: do not drop database in integration dev ([521d503](https://github.com/dnum-mi/dso-console/commit/521d503cdf5e2c24f9e148bc6435db485e1252e7))


### Bug Fixes

* :ambulance: add kaniko proxy ([1564b6f](https://github.com/dnum-mi/dso-console/commit/1564b6f7a696c13846799b38557b1003d2cb87c8))
* :ambulance: stabilize gitlab search and vault secret name ([044da15](https://github.com/dnum-mi/dso-console/commit/044da1511ff8a5f16136807c70194d662c08db26))
* :art: harmonize payload ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :bug: archiveProject on delete ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :bug: change import in gitlab plugin ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :bug: check result.failed in controller ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :bug: check results.failed ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :bug: conflict on add kc group to project ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :bug: create mirror project in gitlab ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :bug: deleteEnvironment before archiveProject ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :bug: des trucs ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :bug: display hyphen only if service message exists ([ba5ed65](https://github.com/dnum-mi/dso-console/commit/ba5ed659954235f8b00e78df24029f1186d23b7a))
* :bug: fix controllers logic ([251fba4](https://github.com/dnum-mi/dso-console/commit/251fba44ebd93e645487da63710add4d9382521d))
* :bug: fix keycloak wrong post ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :bug: harbor wrong return ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :bug: id missing in dsfr tiles ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :bug: load pload plugins only in production or integration mode ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :bug: project expected for projectName ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :bug: refacto and fix epired kcClient ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :bug: replace quay by harbor in cypress ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :bug: review payload variables ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :bug: use proxy on services healthcheck ([85eef14](https://github.com/dnum-mi/dso-console/commit/85eef144f8c87760c61203de7944229af2828047))
* :bug: wrong robot infos in vault ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :closed_lock_with_key: update keycloak domain ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :goal_net: handle &gt;= 500 errors ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :lipstick: make snackbar bakground -color adaptive to theme variations ([851a004](https://github.com/dnum-mi/dso-console/commit/851a004837eb901d02bbf65e20697e457ecde6e2))
* :loud_sound: harmonize plugins error logging ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :loud_sound: plugin return all error object ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :mute: useless log vault plugin ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :rewind: init sonarqube ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :rewind: readd /harbor/ in url ([1b6290e](https://github.com/dnum-mi/dso-console/commit/1b6290ef341d47285bf9d2cc541213a1a415ebb7))
* :sparkles: delete project's secret in vault ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :wrench: change environment management ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :wrench: rename kubeconfig var ([61fdfbf](https://github.com/dnum-mi/dso-console/commit/61fdfbf3bb47b51225d2cf3c00b167c46ff1bedf))


### Reverts

* :twisted_rightwards_arrows: kc init lost in rebase ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))
* :twisted_rightwards_arrows: rebasing on develop ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))


### Code Refactoring

* **api:** :building_construction: replace ansible with plugins ([59cd5fe](https://github.com/dnum-mi/dso-console/commit/59cd5fef0799ff3dd5df7ec42ef879647a6de78a))

## [2.3.0](https://github.com/dnum-mi/dso-console/compare/v2.2.1...v2.3.0) (2023-03-22)


### Features

* :alien: fetch services to get their statuses ([2febba2](https://github.com/dnum-mi/dso-console/commit/2febba22bbed8355d2ea516cd232f6c47ca1a212))
* :art: review tobi ([2febba2](https://github.com/dnum-mi/dso-console/commit/2febba22bbed8355d2ea516cd232f6c47ca1a212))
* :monocle_face: sort projects by ASC name ([ccb7fbb](https://github.com/dnum-mi/dso-console/commit/ccb7fbb5066da6ebc1776a893c86d8d80a292856))
* :sparkles: build project services url in api ([2173f8a](https://github.com/dnum-mi/dso-console/commit/2173f8abade9848c83cc68e4a68da02982d4a887))
* :sparkles: new page dedicated to services ([2febba2](https://github.com/dnum-mi/dso-console/commit/2febba22bbed8355d2ea516cd232f6c47ca1a212))


### Bug Fixes

* :bug: fix container env ([f9fd457](https://github.com/dnum-mi/dso-console/commit/f9fd45715d94789e02d8c88991b02fe9831e4460))

## [2.2.1](https://github.com/dnum-mi/dso-console/compare/v2.2.0...v2.2.1) (2023-03-14)


### Bug Fixes

* :bug: token should authorize "-" ([277f292](https://github.com/dnum-mi/dso-console/commit/277f29232fd5713c0a6e5c42f29ba257b71cdb75))


### Performance Improvements

* :zap: no need to call /account endpoint ([3b278f7](https://github.com/dnum-mi/dso-console/commit/3b278f7e8a2fc22cf3a9aec8b1319c83a934a7f6))

## [2.2.0](https://github.com/dnum-mi/dso-console/compare/v2.1.1...v2.2.0) (2023-03-13)


### Features

* :sparkles: display project and repositories statuses in dashboard and repo pages ([ba27167](https://github.com/dnum-mi/dso-console/commit/ba2716798e8d39e5470b6fe0e97acc3a54480612))


### Bug Fixes

* :bug: add joi schema validation in repo form ([8524e50](https://github.com/dnum-mi/dso-console/commit/8524e50cca3a97965b6cc2eb104620aec2d3e5dd))
* :bug: do nothing when tile is disabled ([e09043c](https://github.com/dnum-mi/dso-console/commit/e09043c34a21315abd8c0c3d1570488057a3d1a6))
* :bug: wrong key for project archived ([8e6b27b](https://github.com/dnum-mi/dso-console/commit/8e6b27b576e7ad28bde1b8a00b84acf366531993))


### Performance Improvements

* :fire: no external token in database, no crypto needed ([0a3fb8c](https://github.com/dnum-mi/dso-console/commit/0a3fb8c5403215e1ae3d24fb8ea7cfcf43a8060f))

## [2.1.1](https://github.com/dnum-mi/dso-console/compare/v2.1.0...v2.1.1) (2023-02-27)


### Bug Fixes

* :globe_with_meridians: translate error messages in french ([a2827c3](https://github.com/dnum-mi/dso-console/commit/a2827c3746aad94293de183725bd2e77ac34f525))

## [2.1.0](https://github.com/dnum-mi/dso-console/compare/v2.0.0...v2.1.0) (2023-02-27)


### Features

* :children_crossing: redirect to services when selecting a project ([3849dad](https://github.com/dnum-mi/dso-console/commit/3849dad734e07ae0250962c8a71c1eb3470614c2))
* :lipstick: whoami in sidemenu rather than snackbar ([70fcbf5](https://github.com/dnum-mi/dso-console/commit/70fcbf537fa32a04538d10673a1d0b4246fddd65))
* :memo: ajout d'un schéma d'architecture ([72f61fb](https://github.com/dnum-mi/dso-console/commit/72f61fbf6060455f56d578003e927196c0292a50))
* :necktie: add constraint for project name length ([f2d3975](https://github.com/dnum-mi/dso-console/commit/f2d3975f8cf5124142edc38a64f219ac9a223985))
* :sparkles: add snackbar to handle errors ([0b5fa71](https://github.com/dnum-mi/dso-console/commit/0b5fa71b5d993fb7529f4fa2b74d78dacb0b33d3))
* add active column on organization table, and client get only active: true ([de7b9d0](https://github.com/dnum-mi/dso-console/commit/de7b9d01bf878ee1cf298736e83410905390a5a3))


### Bug Fixes

* :ambulance: bad owner w/ new queries ([5153b62](https://github.com/dnum-mi/dso-console/commit/5153b621c0707a438f191dd2b06d8c801804f014))
* :ambulance: log more of ansible output ([e2b10d6](https://github.com/dnum-mi/dso-console/commit/e2b10d6875605c836606cb5ba79c963787d4c177))
* :bug: error in ansible route ([a470677](https://github.com/dnum-mi/dso-console/commit/a470677a5d5c3b2b262434adc3f399f948caccd2))
* :bug: error in ansible route ([1565411](https://github.com/dnum-mi/dso-console/commit/1565411524a2c17d0e7de79e5965562053a2024b))
* :goal_net: catch fetch errors and send it to front ([fcca40b](https://github.com/dnum-mi/dso-console/commit/fcca40b2efbc5d38ae8fe0001043671756ebda34))
* :goal_net: optional chaining to avoid errors on selected project ([6750077](https://github.com/dnum-mi/dso-console/commit/67500771939efb2e2329d8ab94407588aa76fa5b))
* :goal_net: return if  user does not have project ([f2a3d74](https://github.com/dnum-mi/dso-console/commit/f2a3d7449abc729b5506aaaf43a163e600c51bcb))
* :lipstick: enforce ui on disabled dsfrtiles ([4de5d25](https://github.com/dnum-mi/dso-console/commit/4de5d257d847c4ecff137face3cbb276d543b779))
* :truck: rename generated gitlab ci file ([d3e637e](https://github.com/dnum-mi/dso-console/commit/d3e637e04ef008c5316b7e720a9fc905c0ab0000))
* :wrench: update postgres image ([16e5d55](https://github.com/dnum-mi/dso-console/commit/16e5d557c52e149def7f7c216371ba23fc721bbf))


### Reverts

* :rewind: rebase error ([728a704](https://github.com/dnum-mi/dso-console/commit/728a704522a3f5cfcc2dc5879671a83a051a82c6))

## [2.0.0](https://github.com/dnum-mi/dso-console/compare/v1.0.0...v2.0.0) (2023-02-22)


### ⚠ BREAKING CHANGES

* **database:** :card_file_box: new database model, queries,

### Features

* :art: easier generation of files object ([529a188](https://github.com/dnum-mi/dso-console/commit/529a188505d7ec9bd53e7ca2909b8a8d94e31897))
* :art: specific routes, add validation schema ([69645b9](https://github.com/dnum-mi/dso-console/commit/69645b9b392f8f56b8d3606780dfa63098fa5240))
* :art: use only one get route ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* :bug: mob review ([529a188](https://github.com/dnum-mi/dso-console/commit/529a188505d7ec9bd53e7ca2909b8a8d94e31897))
* :card_file_box: add an association table for users and projects ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* :card_file_box: add destroy functions for db ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* :card_file_box: wip : working with @ArnaudTa on liveshare ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* :construction: add delete repo button ([ad64daf](https://github.com/dnum-mi/dso-console/commit/ad64dafce222ea572e6169c502aaed08562a70e7))
* :construction: Add download and copy, missing format ([529a188](https://github.com/dnum-mi/dso-console/commit/529a188505d7ec9bd53e7ca2909b8a8d94e31897))
* :construction: add status and locked for project ([1bb55b8](https://github.com/dnum-mi/dso-console/commit/1bb55b8758eecced9204aa7b77f404ac6a3d45b0))
* :construction: adding api implementation ([3c76eac](https://github.com/dnum-mi/dso-console/commit/3c76eacfa47bfa4f2d8133a09b60788c0527ce9e))
* :construction: all controllers writtend ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* :construction: applying review requested changes ([529a188](https://github.com/dnum-mi/dso-console/commit/529a188505d7ec9bd53e7ca2909b8a8d94e31897))
* :construction: commit à ecraser - wip fs file generator ([529a188](https://github.com/dnum-mi/dso-console/commit/529a188505d7ec9bd53e7ca2909b8a8d94e31897))
* :construction: feature to achieve later, keep asking for project status ([57846f9](https://github.com/dnum-mi/dso-console/commit/57846f923f15771186b8a7816324df42d55d86cb))
* :construction: first database model ([69f51f2](https://github.com/dnum-mi/dso-console/commit/69f51f2eb16b052d4fddbb909ac7a5f0913b2c94))
* :construction: new project controller ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* :construction: remove done todos ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* :construction: uncomment path for delete repo and projects ([8fb7cd9](https://github.com/dnum-mi/dso-console/commit/8fb7cd9b5c67857862cebfde091a3b5bbba54c93))
* :construction: wip - ci files generated by server ([529a188](https://github.com/dnum-mi/dso-console/commit/529a188505d7ec9bd53e7ca2909b8a8d94e31897))
* :construction: wip downloading file ([529a188](https://github.com/dnum-mi/dso-console/commit/529a188505d7ec9bd53e7ca2909b8a8d94e31897))
* :construction: wip fix unit tests ([31c3a86](https://github.com/dnum-mi/dso-console/commit/31c3a863104f553adcefb5e78d64613e32f65704))
* :lipstick: fix snackbar on bottom left ([7823c99](https://github.com/dnum-mi/dso-console/commit/7823c991b4adf62e380193d7f1d9fc33108dc368))
* :lock: add crypto module to encrypt externalToken or other data if needed ([c5806b3](https://github.com/dnum-mi/dso-console/commit/c5806b392ec2b203f0d54a62527c9d96570f2918))
* :necktie: cannot update nor delete permission if not permitted - controller side ([3c76eac](https://github.com/dnum-mi/dso-console/commit/3c76eacfa47bfa4f2d8133a09b60788c0527ce9e))
* :necktie: disable delete permission for owner ([3c76eac](https://github.com/dnum-mi/dso-console/commit/3c76eacfa47bfa4f2d8133a09b60788c0527ce9e))
* :necktie: permissions should be enabled only for permitted users ([3c76eac](https://github.com/dnum-mi/dso-console/commit/3c76eacfa47bfa4f2d8133a09b60788c0527ce9e))
* :passport_control: organization controller ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* :sparkles: add archiveProject btn ([e412223](https://github.com/dnum-mi/dso-console/commit/e41222346a4e3d9d60100d59b4edf160a2319c08))
* :sparkles: add backend function to generate random passwords ([5244597](https://github.com/dnum-mi/dso-console/commit/52445972b7be13862d395059f82fae81b7efa495))
* :sparkles: add delete playbook call in deleteRepo controller ([8abe695](https://github.com/dnum-mi/dso-console/commit/8abe6950e8f26aa01b7b1a95e4fbc4627f26d925))
* :sparkles: add delete trigger for environment ([3c76eac](https://github.com/dnum-mi/dso-console/commit/3c76eacfa47bfa4f2d8133a09b60788c0527ce9e))
* :sparkles: add environment and permissions management ([3c76eac](https://github.com/dnum-mi/dso-console/commit/3c76eacfa47bfa4f2d8133a09b60788c0527ce9e))
* :sparkles: add environment page ([a5a5129](https://github.com/dnum-mi/dso-console/commit/a5a5129e89cb9594204b08c9cc76c3a30bb04eb7))
* :sparkles: Add GitLab ci generation in repoForm ([529a188](https://github.com/dnum-mi/dso-console/commit/529a188505d7ec9bd53e7ca2909b8a8d94e31897))
* :sparkles: Add gitlabCi form for repo ([839f1e1](https://github.com/dnum-mi/dso-console/commit/839f1e18bf99f1bef53ed3ab39a64ab097c6a0d8))
* :sparkles: add GitlabCI generated file ([529a188](https://github.com/dnum-mi/dso-console/commit/529a188505d7ec9bd53e7ca2909b8a8d94e31897))
* :sparkles: add helm charts ([e540325](https://github.com/dnum-mi/dso-console/commit/e5403252cd7d888c839be63758c15c1fdce76c71))
* :sparkles: add log table in model ([642b245](https://github.com/dnum-mi/dso-console/commit/642b245a4a0ffa8877c900fa786345fd484f60f8))
* :sparkles: add misc routes, healthz/version ([520976d](https://github.com/dnum-mi/dso-console/commit/520976ddfebba2d05385ba66d27af809e8736287))
* :sparkles: ajout d'un système de role propre à la console avec authentification admin ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* :sparkles: ansible-api respond playbook rc, server stores it in db ([7774045](https://github.com/dnum-mi/dso-console/commit/7774045ae6404e1f0de810bb09a7832c0292baba))
* :sparkles: call delete repo and archive project playbooks ([97a7b13](https://github.com/dnum-mi/dso-console/commit/97a7b1300847fafa5053d58fb05079ef52a9d041))
* :sparkles: ciForm  ok ([529a188](https://github.com/dnum-mi/dso-console/commit/529a188505d7ec9bd53e7ca2909b8a8d94e31897))
* :sparkles: display current user name in closeable alert ([349ade9](https://github.com/dnum-mi/dso-console/commit/349ade9f5b8017bf206aff2c894a56cc675d6873))
* :sparkles: get user's group from keycloak ([8311622](https://github.com/dnum-mi/dso-console/commit/83116226e7a3e172a94b4f988d037ec1dcc8aaf4))
* :sparkles: record ansible responses in database ([5753883](https://github.com/dnum-mi/dso-console/commit/5753883ae32f36e28a128f396df3f9669e5a854b))
* :sparkles: wip components for environment managing ([3c76eac](https://github.com/dnum-mi/dso-console/commit/3c76eacfa47bfa4f2d8133a09b60788c0527ce9e))
* :test_tube: ([529a188](https://github.com/dnum-mi/dso-console/commit/529a188505d7ec9bd53e7ca2909b8a8d94e31897))
* :test_tube: rewrite random utils for tests ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* **Helm:** :art: add env per container ([48b41cf](https://github.com/dnum-mi/dso-console/commit/48b41cfea037ce90812197990c54d2726fb75ac7))
* **Helm:** :art: variabilize server imports ([0973646](https://github.com/dnum-mi/dso-console/commit/09736463d3011f96348f94cf3ad8cc69c9c0f07e))


### Bug Fixes

* :alembic: changement du keycloak flow ([1af0d85](https://github.com/dnum-mi/dso-console/commit/1af0d8504766f3f0ebab92feff8f4795e4e1c67e))
* :art: variabilize pvc name ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* :bug: add await on start server functions and fix tests ([c8e66f8](https://github.com/dnum-mi/dso-console/commit/c8e66f87f4ccd4be1775b32729f12d9c0e919f35))
* :bug: add refresh keycloak token ([b758e44](https://github.com/dnum-mi/dso-console/commit/b758e44241c868a1e8a1546271f1806069370964))
* :bug: bind do not always works ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* :bug: change create project and change message logs ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* :bug: controller response before ansible fetch ([8983c45](https://github.com/dnum-mi/dso-console/commit/8983c457cd8de96d117d51881668b37c3b4f9407))
* :bug: delete default argo repo at deleting ([5fafe99](https://github.com/dnum-mi/dso-console/commit/5fafe9919b7d08447e356eb260795a6cb91f3ba3))
* :bug: fix projectAddUserController ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* :bug: flatMap didn't work as expected ([3c76eac](https://github.com/dnum-mi/dso-console/commit/3c76eacfa47bfa4f2d8133a09b60788c0527ce9e))
* :bug: forgot to load repositories data ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* :bug: import env ([98c1632](https://github.com/dnum-mi/dso-console/commit/98c16329e8fbd3b0bcabf2ac132d53931ef7f9bf))
* :bug: init db doit être séquentiel pour ne pas violer l'intégrité des tables ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* :bug: isInfra & isPrivate false if undefined ([2fa987d](https://github.com/dnum-mi/dso-console/commit/2fa987d0872f6884627d6060c64d27d932a2db5c))
* :bug: isInfra not send to ansible ([b049746](https://github.com/dnum-mi/dso-console/commit/b049746b97e5529d6f5368e045eb96a266bb432b))
* :bug: mode dégradé si payload n'est pas bon ([14309cf](https://github.com/dnum-mi/dso-console/commit/14309cf41835f59168c72b6a4840fcf1ae8264d2))
* :bug: repositories may be empty ([584798f](https://github.com/dnum-mi/dso-console/commit/584798f1ebba5894b2f9181cbe0f9bdbd49cdd6c))
* :bug: review changes ([5e4bdb7](https://github.com/dnum-mi/dso-console/commit/5e4bdb73414102728e68d56fe30d65a7f718a0f7))
* :bug: send proper data to ansible ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* :bug: send200 if code is OK ([08ca7eb](https://github.com/dnum-mi/dso-console/commit/08ca7ebdf0b24dabc60baa631c4887854780465c))
* :bug: show permissionForm only when environment is created ([3c76eac](https://github.com/dnum-mi/dso-console/commit/3c76eacfa47bfa4f2d8133a09b60788c0527ce9e))
* :bug: stabilize playbookDir in different execution execution ([69645b9](https://github.com/dnum-mi/dso-console/commit/69645b9b392f8f56b8d3606780dfa63098fa5240))
* :bug: update ansible calls ([04ee9ff](https://github.com/dnum-mi/dso-console/commit/04ee9fff7e78bbe4305ad7a1923df842a80a49ad))
* :bug: update orgName generation to new db schema ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* :bug: use flatMap to iterate over two arrays ([3c76eac](https://github.com/dnum-mi/dso-console/commit/3c76eacfa47bfa4f2d8133a09b60788c0527ce9e))
* :bug: wip bug ansible repositoryInitializing ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* :bug: wip working on todo's ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* :bug: working on todo's ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* :card_file_box: organization should be a FK in projects ([d014387](https://github.com/dnum-mi/dso-console/commit/d014387c8d09182675ddf98d381e27b78bc28545))
* :card_file_box: turn envList into array of objects ([41f0278](https://github.com/dnum-mi/dso-console/commit/41f027858f108fb056958c118bf664a141e7623c))
* :construction_worker: Copy test-utils in client docker ([529a188](https://github.com/dnum-mi/dso-console/commit/529a188505d7ec9bd53e7ca2909b8a8d94e31897))
* :construction: trying to log details for ansible api call ([ae944ae](https://github.com/dnum-mi/dso-console/commit/ae944aea77d0f13798c63e9bf9690363f75e9bc9))
* :construction: wip ([529a188](https://github.com/dnum-mi/dso-console/commit/529a188505d7ec9bd53e7ca2909b8a8d94e31897))
* :fire: remove bad log and comms ([748c43d](https://github.com/dnum-mi/dso-console/commit/748c43d93212a79b2dd04e527f97da5dd5d585b5))
* :goal_net: add front error management for createProject ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* :goal_net: catch errors in front when calling back ([5331773](https://github.com/dnum-mi/dso-console/commit/53317734961895bf348c758774d23c2505f812a8))
* :lipstick: update UI for new DSFR version ([62750c4](https://github.com/dnum-mi/dso-console/commit/62750c478ecac453542e5933d1464af2a752e2d4))
* :lock: filter users sensitive infos ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* :lock: improve security using node utility function to compare hashes ([ea0e730](https://github.com/dnum-mi/dso-console/commit/ea0e73084a04c85d69e8d556e73241982df5d40f))
* :loud_sound: mute logs for health route ([b1eaad5](https://github.com/dnum-mi/dso-console/commit/b1eaad5701ac73b131b0cb8692111ae5fd0a8d84))
* :mute: remove sequelize logs to preserve data ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* :necktie: permission level goes from 0 to 3, 0 by default, 3 for owner ([3c76eac](https://github.com/dnum-mi/dso-console/commit/3c76eacfa47bfa4f2d8133a09b60788c0527ce9e))
* :pencil2: typo on var name ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* :recycle: change where directive to through associations ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* :recycle: fix ([8d2c911](https://github.com/dnum-mi/dso-console/commit/8d2c911b855f19b0a6568e2857129c9c62fcfcc9))
* :recycle: use sequelize querytypes ([d45472a](https://github.com/dnum-mi/dso-console/commit/d45472a89a5be2a74c1af2da14d41ceb5d118284))
* :rotating_light: Sonar warnings ([529a188](https://github.com/dnum-mi/dso-console/commit/529a188505d7ec9bd53e7ca2909b8a8d94e31897))
* :rotating_light: SonarQube warning ([529a188](https://github.com/dnum-mi/dso-console/commit/529a188505d7ec9bd53e7ca2909b8a8d94e31897))
* :test_tube: fix TU ([26bd4f1](https://github.com/dnum-mi/dso-console/commit/26bd4f1477bd3664472ca4d8989630f09c2a7e0b))
* :test_tube: use dedicated en var for ct tests ([529a188](https://github.com/dnum-mi/dso-console/commit/529a188505d7ec9bd53e7ca2909b8a8d94e31897))
* :test_tube: wip fix repo ansible fetch failed ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* :truck: fix generateCIFiles feature ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))
* :truck: rename folder for generating files ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))


### Performance Improvements

* :art: use map instead of forEach for array generation ([03c78fa](https://github.com/dnum-mi/dso-console/commit/03c78fa5f28bb86fad7e3e1b142a1c71d1639054))
* :stethoscope: add health probes in templates ([d645f2e](https://github.com/dnum-mi/dso-console/commit/d645f2e35460ba92a67aeb0ea65ac9356ed36381))


### Reverts

* :egg: hide environments and permissions feature waiting for playbooks ([edebee9](https://github.com/dnum-mi/dso-console/commit/edebee944905f5723518aaca0c37a51deeac80a6))
* :rewind: hide snackbar for now ([6afe9e8](https://github.com/dnum-mi/dso-console/commit/6afe9e81bc5b32cb544456d7e697be66ea0349be))


### Code Refactoring

* **database:** :card_file_box: new database model, queries, ([b547548](https://github.com/dnum-mi/dso-console/commit/b547548fbe70955c2131901509be0b929eb9b549))

## 1.0.0 (2022-12-16)


### Features

* :alembic: clone in entrypoint ([f97edb0](https://github.com/dnum-mi/dso-console/commit/f97edb07c31036cb1fc1882610e2f78185106028))
* :art: baudoin's review ([656aac6](https://github.com/dnum-mi/dso-console/commit/656aac693a4c21a64402dd9bcd8b978f2fb63b55))
* :art: introduce CLONE_DIR, where to clone ([263ea79](https://github.com/dnum-mi/dso-console/commit/263ea79deef5d9f58e2fc10ffcf98e31a4b41bc2))
* :art: spread instead of push ([530b366](https://github.com/dnum-mi/dso-console/commit/530b366368b8eb1a2f2597362ecc2c5aa2bc1145))
* :bento: Add images for services logos in public folder ([6d8e91c](https://github.com/dnum-mi/dso-console/commit/6d8e91ca9837dd60f603d5ed364e11fb3485a5b5))
* :bento: Definitive logos for services ([e2e6270](https://github.com/dnum-mi/dso-console/commit/e2e627081224433e0d190876a8791aa1d2ea8d6b))
* :boom: first query successfull ([61a7cd5](https://github.com/dnum-mi/dso-console/commit/61a7cd5857a6e6c648219d20399c19e8672a37db))
* :boom: first query successfull ([36c973e](https://github.com/dnum-mi/dso-console/commit/36c973ebaa9f3a52669d0f921eedfb8aee6c4a9f))
* :bricks: change routes ([af30bd8](https://github.com/dnum-mi/dso-console/commit/af30bd895bef8203b3e06facfa04d93be83b86f9))
* :card_file_box: Add api getProjectById ([98cd231](https://github.com/dnum-mi/dso-console/commit/98cd23165e72add49762bc31b81c54526f42b768))
* :card_file_box: Add api getProjectById ([98976d0](https://github.com/dnum-mi/dso-console/commit/98976d0a33cf65ee3be4baad629dae107410c6e3))
* :card_file_box: Add createProject query ([9bcfb05](https://github.com/dnum-mi/dso-console/commit/9bcfb059d2c3c51c64ee223b777da5d999339e44))
* :card_file_box: Add owner from keycloak in project ([5aa9aad](https://github.com/dnum-mi/dso-console/commit/5aa9aad9f12b5c5060139baebd5b2869ea91b1f4))
* :card_file_box: Add owner from keycloak in project ([cadb474](https://github.com/dnum-mi/dso-console/commit/cadb4745648ecdfc0ffbbc045ca4a054ee062615))
* :card_file_box: Add postgres and pgadmin ([76374e6](https://github.com/dnum-mi/dso-console/commit/76374e6acd72ba89ab15bdf4c7e1ff82f00e110d))
* :card_file_box: Add user id in project queries ([48949df](https://github.com/dnum-mi/dso-console/commit/48949df562179493e2b524b541129ff520913d86))
* :card_file_box: Create database & table on server start if not exists ([14b9f6b](https://github.com/dnum-mi/dso-console/commit/14b9f6b5359e33bd345eccb1be081698fbda8b59))
* :card_file_box: Wip add createProject api ([1414bc0](https://github.com/dnum-mi/dso-console/commit/1414bc0ed59f63fd41f21dcc76dcebebd1a5c4cf))
* :card_file_box: Wip app and server js ([2d4efdf](https://github.com/dnum-mi/dso-console/commit/2d4efdf91f98a82fcd18c3887c1943a283c653c8))
* :construction: (wip) add project mongoose model ([76e8d77](https://github.com/dnum-mi/dso-console/commit/76e8d77a3342ff58707b47977a8cdd14a721339d))
* :construction: (wip) trying to connect to keycloak with server ([2401fda](https://github.com/dnum-mi/dso-console/commit/2401fdaa383a38632e95d1097e4a3766ef7f6563))
* :construction: Add check in addRepo and addUser queries ([c2bad66](https://github.com/dnum-mi/dso-console/commit/c2bad663b9aba71dffd9e023cbd098a38353ee0d))
* :construction: Add DsfrTable for users ([8b63e84](https://github.com/dnum-mi/dso-console/commit/8b63e84bd6923f5128efbd427e659418794f7eaf))
* :construction: Add DsoTeam table ([ca3e2c3](https://github.com/dnum-mi/dso-console/commit/ca3e2c3462d9e17d90e10afed4432b24735ded24))
* :construction: Add final todos ([c224592](https://github.com/dnum-mi/dso-console/commit/c2245927e6a2b61cd3bf4fbef4fddf5708ccd20f))
* :construction: Add OrderProject ([f4d2962](https://github.com/dnum-mi/dso-console/commit/f4d2962ec7b76a13c7f9849302f3a0279e79a442))
* :construction: Add postgres and pgadmin ([a7ce8c5](https://github.com/dnum-mi/dso-console/commit/a7ce8c5ff9aee0003f7d2066a6f2e172b9d5bd08))
* :construction: Add postgres and pgadmin ([6fdf560](https://github.com/dnum-mi/dso-console/commit/6fdf56045839636324015739852ee85d5685d584))
* :construction: Add removeUserFromProject function ([9430fc6](https://github.com/dnum-mi/dso-console/commit/9430fc697e9761c3e79f0d37bef16dcf52f1e889))
* :construction: Add routes for projects ([cd14601](https://github.com/dnum-mi/dso-console/commit/cd146017e1a6646777451e0ed711b9d6556e5393))
* :construction: Add SideMenu to app ([3373f8c](https://github.com/dnum-mi/dso-console/commit/3373f8cf18607293f1081172ed93e8dabd69fd28))
* :construction: Configure keycloak for frontend ([d8074ac](https://github.com/dnum-mi/dso-console/commit/d8074ac468a562322a8d44ed5d08b26be56cc7e8))
* :construction: Failing specs projects ([a56cb8c](https://github.com/dnum-mi/dso-console/commit/a56cb8cb0685e3173b867519d09f4ca41b217959))
* :construction: Func removeUserFromProject ([95fdc7f](https://github.com/dnum-mi/dso-console/commit/95fdc7f8cd8285bf18257364f833b9eb84588cf1))
* :construction: Handle menu collapse in sm mode ([5237e89](https://github.com/dnum-mi/dso-console/commit/5237e892f86f5c4abd170562867a4745e2121bb9))
* :construction: trying to access server /api/v-4/version ([a27483c](https://github.com/dnum-mi/dso-console/commit/a27483c6525091eca564b9ad615636edf79c5283))
* :construction: trying to access server /api/v1/version ([2e43c8f](https://github.com/dnum-mi/dso-console/commit/2e43c8fd0c13f59bd40567912815a605c43bf0dc))
* :construction: wip add node-postgres ([50ef526](https://github.com/dnum-mi/dso-console/commit/50ef526f2e647d5a16254468e9e83996e71baab1))
* :construction: wip business rules orderProject ([24f7daa](https://github.com/dnum-mi/dso-console/commit/24f7daaae5cba5d7fdb6ee1ebc700c9aba1a0830))
* :construction: wip pg ([391bccb](https://github.com/dnum-mi/dso-console/commit/391bccbbf34c9a365eed847824edb718643a8d73))
* :construction: working on api x keycloak ([183f4d8](https://github.com/dnum-mi/dso-console/commit/183f4d8c9e49407f500444210f2f143dcf1433c3))
* :hammer: Add turbo ([a3fdc96](https://github.com/dnum-mi/dso-console/commit/a3fdc96e23fbd3c66dea95ce89829dbe873b835a))
* :hammer: Update docker compose scripts for pnpm ([537ba52](https://github.com/dnum-mi/dso-console/commit/537ba52f8c75659a8204beb5e48fa2ff11572be2))
* :heavy_plus_sign: Add axios for api management ([591b012](https://github.com/dnum-mi/dso-console/commit/591b012df344e0842ce3848eaae4aa0c3beceb73))
* :heavy_plus_sign: Add fastify keycloak adapter ([575e8d7](https://github.com/dnum-mi/dso-console/commit/575e8d71aa5d4fe9a0f2da94c484de2867ca5c9a))
* :lipstick: Resize sidemenu and content ([61670d8](https://github.com/dnum-mi/dso-console/commit/61670d816aa3b70aa164e3d8531b12b3f835fcc6))
* :lipstick: thiner projects subheader ([4427945](https://github.com/dnum-mi/dso-console/commit/442794546e8977dc3298a5ec92e68a30ef3775eb))
* :lipstick: Update navigation in frontend ([5751ed3](https://github.com/dnum-mi/dso-console/commit/5751ed36dbdbeceb832c9bcc0c9972fca2abd26c))
* :lock: Add keycloak token check on ansible api ([afe18f5](https://github.com/dnum-mi/dso-console/commit/afe18f58dc7c041adb40b1dee7617cb6b38ef9f5))
* :loud_sound: forward request id to ansible api ([b6107bb](https://github.com/dnum-mi/dso-console/commit/b6107bbc322d6740bfbe7345e5865af6df4cb219))
* :memo: Add documentation inside application ([0d70a0e](https://github.com/dnum-mi/dso-console/commit/0d70a0e8c6b4248e427e63d987dce7498f0c64ee))
* :necktie: Add removeuser func ([3da7701](https://github.com/dnum-mi/dso-console/commit/3da77019f350b4dee5031ffbf5a97735299b0df9))
* :necktie: users[].email must be unique ([d74b99d](https://github.com/dnum-mi/dso-console/commit/d74b99d642cdb3dea3fcd18116f644aa34542dbf))
* :poop: dinindex turbo ([d7e78cb](https://github.com/dnum-mi/dso-console/commit/d7e78cb1e15c7008f761af42961bdc2754b117d0))
* :poop: Pass current location to redirectUri ([ee65e42](https://github.com/dnum-mi/dso-console/commit/ee65e42daaff2fb20c4a9142a5ba87357e415088))
* :poop: test 2 ([5c3b1da](https://github.com/dnum-mi/dso-console/commit/5c3b1da4c4d95ce3a9294c175f4826e174ae6436))
* :poop: try to remove .tubro/ ([01ba3ef](https://github.com/dnum-mi/dso-console/commit/01ba3efaa8efacbb97638c5e89aebd3255149d2b))
* :poop: turbo unindexation test ([2e7ba79](https://github.com/dnum-mi/dso-console/commit/2e7ba79848aae2fc174e364de867ff59159ed39c))
* :recycle: Baudoin's review, userProfile in store ([c1a34b4](https://github.com/dnum-mi/dso-console/commit/c1a34b4c2c48455874829966d220b0b3137a010c))
* :recycle: Harmonize api's names ([71ed577](https://github.com/dnum-mi/dso-console/commit/71ed577474dbe431cc1ebdb83336510ac93c58c8))
* :recycle: Merge conf and init in a single keycloak file ([e777b02](https://github.com/dnum-mi/dso-console/commit/e777b028ce94df3288ab03bc6bdeea2ba2408fde))
* :recycle: service url construction ([6b25ab3](https://github.com/dnum-mi/dso-console/commit/6b25ab3d40449da2b50ecd12604c6030aa0b287d))
* :see_no_evil: Ignore .tubro ([d927f05](https://github.com/dnum-mi/dso-console/commit/d927f0559ecff8d3805709d9eca0487786295b52))
* :sparkles: Add allTiles for all services, adapt projectTiles to selectedProject ([d207065](https://github.com/dnum-mi/dso-console/commit/d207065a628e26293f441a38ae9dd17950188d7c))
* :sparkles: Add DsoService content ([024cbd0](https://github.com/dnum-mi/dso-console/commit/024cbd0c50475413a2a41097e301c88c87885363))
* :sparkles: Add envList to project ([02e5215](https://github.com/dnum-mi/dso-console/commit/02e5215ec25a9dc7decd6c7d4d26c68a3a1b5fa5))
* :sparkles: Add infra repo checkbox ([b0c0602](https://github.com/dnum-mi/dso-console/commit/b0c06020ea9f2aa1580514aa9498aec38cb3824b))
* :sparkles: Add sidemenu and tmp routes ([be02a0c](https://github.com/dnum-mi/dso-console/commit/be02a0c2184b8ff92b13745efdfdda5626d91ec6))
* :sparkles: Add specific endpoints to console api ([a35b9cc](https://github.com/dnum-mi/dso-console/commit/a35b9ccf452db0db438990633eded6b8d5ae0be7))
* :sparkles: Add user to project ([85d5a1c](https://github.com/dnum-mi/dso-console/commit/85d5a1c98f9374ba9c7fb9b4f179bb8f40a6b0f3))
* :sparkles: Add users[i].id in query ([35a36b4](https://github.com/dnum-mi/dso-console/commit/35a36b437d224b3d4b490a7c0ff2fdfe42f80410))
* :sparkles: Add vault url ([264d132](https://github.com/dnum-mi/dso-console/commit/264d132a839d93a6677b4f1520eadb3b52497f47))
* :sparkles: Add windicss to project ([8db02f5](https://github.com/dnum-mi/dso-console/commit/8db02f531f6f4dbc768ae726597b957cb8cb8e3a))
* :sparkles: Create projects view ([aa0d833](https://github.com/dnum-mi/dso-console/commit/aa0d83356ab679261893cb563237062cdbbc04e6))
* :sparkles: Finish v1 orderProject form ([590eb74](https://github.com/dnum-mi/dso-console/commit/590eb744f9daab7b9e34e6e2e9a376257f8290da))
* :sparkles: Prepare ansible call for project provisioning ([a3d0918](https://github.com/dnum-mi/dso-console/commit/a3d09185837675f7954dad3185651ca300373bb1))
* :sparkles: Separate ansible wrapper in a new api called ansible-api ([bcd64db](https://github.com/dnum-mi/dso-console/commit/bcd64dbdfa3c043bcf7c77f783ce1d36e43e4d05))
* :speech_balloon: Correct services url ([264d132](https://github.com/dnum-mi/dso-console/commit/264d132a839d93a6677b4f1520eadb3b52497f47))
* :speech_balloon: Update app's title ([869e2a3](https://github.com/dnum-mi/dso-console/commit/869e2a34455f1adb80d52e7fc5c4bc4c884368dd))
* :speech_balloon: Update services url ([264d132](https://github.com/dnum-mi/dso-console/commit/264d132a839d93a6677b4f1520eadb3b52497f47))
* :technologist: Add husky unit tests for server ([75e3a23](https://github.com/dnum-mi/dso-console/commit/75e3a23199ba15de9229809558a2b2569e38bdd4))
* :technologist: Add watch src for hot reload ([e4e129d](https://github.com/dnum-mi/dso-console/commit/e4e129db4803f3bc5ed5a1ee3fc759ebcef38d89))
* :truck: Better images for logos ([8ce9112](https://github.com/dnum-mi/dso-console/commit/8ce911280348e49d9f197dc9947d0d7d5bf5cee4))
* :truck: Create folder projects in views,  create store project ([a1df0f6](https://github.com/dnum-mi/dso-console/commit/a1df0f6bfcdbdba96d9b8c1c77e8500074f59512))
* login on keycloack TEST ([20ab492](https://github.com/dnum-mi/dso-console/commit/20ab492a78f5e3e81a3295a3416a4422422d4244))
* page login ([0c3946b](https://github.com/dnum-mi/dso-console/commit/0c3946b0ff04889b8b0fcf7b5160fea4409b3e8d))
* **projectInit:** :building_construction: Add client folder ([9f3e90d](https://github.com/dnum-mi/dso-console/commit/9f3e90d305aebc6d9508d4570ffc0d1fac9502f2))
* **projectInit:** :heavy_plus_sign: Add Stylelint ([21f33e0](https://github.com/dnum-mi/dso-console/commit/21f33e0554b04932a35ca723934c24bd93122513))
* **projectInit:** :tada: Vite vue3 basic installation ([41aeb82](https://github.com/dnum-mi/dso-console/commit/41aeb824d02ba387bc8c842b07351fd55b221782))


### Bug Fixes

* :alembic: edit code to run with new ansible directories ([8822d95](https://github.com/dnum-mi/dso-console/commit/8822d953e93db6f4ddc00383e7ad4a8c01e8cbaf))
* :alembic: edit server image, kubeconfig fix for ansible ([5e02c5e](https://github.com/dnum-mi/dso-console/commit/5e02c5ef97a5fc67cfd30d296b36bf339fff8251))
* :alembic: Try to fix keycloak redirect ([954bc51](https://github.com/dnum-mi/dso-console/commit/954bc513be0ff9a1e46b140af334273f710b9ec2))
* :ambulance: fix a commit written too late in the night ([ee0cc99](https://github.com/dnum-mi/dso-console/commit/ee0cc99fab9a243ffddcc5ed874cbcd449d319f4))
* :art: add env for keycloak in FRONT ([dea4e38](https://github.com/dnum-mi/dso-console/commit/dea4e38b36d9bb672f4f9e1079e9540d0e93d5af))
* :art: rename file user in stores ([86be41e](https://github.com/dnum-mi/dso-console/commit/86be41e2ee7d6c8d0a0baad9507fe46fb8a527b4))
* :bug: Add case sensitivity for init deb script ([699dedd](https://github.com/dnum-mi/dso-console/commit/699dedd5c8b149d8de83b632184fdb28b15784fc))
* :bug: Add tagName (type) so it's closeable ([8aa65d5](https://github.com/dnum-mi/dso-console/commit/8aa65d53d03641ae30b0f989874f4acb85889b3f))
* :bug: duplicated line ([2dad819](https://github.com/dnum-mi/dso-console/commit/2dad819540e76852251ef3ac8b7c3618abec0c71))
* :bug: Finish removeUser feature ([25a4f36](https://github.com/dnum-mi/dso-console/commit/25a4f363ca99b3dd5b9a9adf6cf940021c509a5e))
* :bug: Fix after dsfr's upgrade ([9273618](https://github.com/dnum-mi/dso-console/commit/92736182d04f6a965b15d0514a8c18e329ebec7a))
* :bug: Fix bugs revealed by e2e tests ([f9ff1fc](https://github.com/dnum-mi/dso-console/commit/f9ff1fc8c633b894864489cb7b8c51eaf733e012))
* :bug: Fix db init if not exists ([d3a7b77](https://github.com/dnum-mi/dso-console/commit/d3a7b779fb00399a94e6db570583bed77e4fc355))
* :bug: Fix endless redirection ([7762a83](https://github.com/dnum-mi/dso-console/commit/7762a8358b6a76879e41ac6ea5a29765ec36a2e1))
* :bug: Fix init db error ([9b50685](https://github.com/dnum-mi/dso-console/commit/9b5068519d7d26126c9730d32b375cb9e9243e92))
* :bug: Fix multiples bugs ([fc94d99](https://github.com/dnum-mi/dso-console/commit/fc94d992ee0495113f7e5f4cd165f90b2460dd9d))
* :bug: Fix potentital bugs ([ec04eee](https://github.com/dnum-mi/dso-console/commit/ec04eeeeb745be5e4a4ab5ad8a1c60e08cb74168))
* :bug: Handle cases where no users ([47befb9](https://github.com/dnum-mi/dso-console/commit/47befb9e0dcfa07e733596aa5ccd9323e7447ad6))
* :bug: Handle cases where users key does not exist in project ([98381dc](https://github.com/dnum-mi/dso-console/commit/98381dc3a746993c563b0b817cd6e985c40d4cc6))
* :bug: Improve backend & fix in adequation of front changes ([a4df195](https://github.com/dnum-mi/dso-console/commit/a4df19533cd2e634149c549e5a717bf7b5bd1280))
* :bug: kc logout ([c3621b9](https://github.com/dnum-mi/dso-console/commit/c3621b9f4db92b1a73a21b53d3894d79f2bdeb1d))
* :bug: Last reviews ([4f39f8a](https://github.com/dnum-mi/dso-console/commit/4f39f8aea216aee29ff1128a7c5b60174e98b489))
* :bug: multiple fixes, increase some log verbosity ([39e543b](https://github.com/dnum-mi/dso-console/commit/39e543bc8071d8323af96e85a6f6c8b7beffce19))
* :bug: Reinit projects in store before pushing query result ([53d6c3f](https://github.com/dnum-mi/dso-console/commit/53d6c3f94e1211a69034c580abc6bd2731d7e717))
* :bug: remove extra properties, it failed tests ([98abead](https://github.com/dnum-mi/dso-console/commit/98abeadf4ad5aad0eaab3f706500e27c98444ce3))
* :bug: Remove unintentionaly added import ([8c6cab6](https://github.com/dnum-mi/dso-console/commit/8c6cab6fa05b57639003ea1e514da973d79fad3b))
* :bug: Review tobi, an array even empty is always true ([9fe7068](https://github.com/dnum-mi/dso-console/commit/9fe706894c930fa5f2d187c0ce1500d75a797e29))
* :bug: update for production ready ([4e80d61](https://github.com/dnum-mi/dso-console/commit/4e80d61fd3f9ec0526d99b3f3fec65a4ddfa78b0))
* :coffin: Remove test class ([38a39ed](https://github.com/dnum-mi/dso-console/commit/38a39ed849fdcc7f62bdb24223f5cd74407e5aa9))
* :coffin: Remove unused function ([b557bdc](https://github.com/dnum-mi/dso-console/commit/b557bdcb5b8fcb927ffc30cf9e4c0830d35b5363))
* :construction_worker: Remove prod flag for dev stage in server dockerfile ([3e28a00](https://github.com/dnum-mi/dso-console/commit/3e28a00d1a652d46fcb0072471090ee2ad0fb899))
* :construction: broken install in test yml ([1121d8b](https://github.com/dnum-mi/dso-console/commit/1121d8b7f90fc301a303c8705a039e1175d55eae))
* :construction: Fix init keycloak in frontend ([0b41546](https://github.com/dnum-mi/dso-console/commit/0b41546b355e3583dd02fc1793c24c30af860030))
* :construction: Wip reinit newUser object ([699a0bb](https://github.com/dnum-mi/dso-console/commit/699a0bbf8600efed4d1bf62a07d02f78c0e1c38c))
* :construction: working on keyclock + pinia ([95d5822](https://github.com/dnum-mi/dso-console/commit/95d5822b23277b24a87f6f6d6c8ca77fc6a49926))
* :fire: Remove useless silentchecksso & move cypress/vue to optional dep ([3b85f7a](https://github.com/dnum-mi/dso-console/commit/3b85f7a7f792d6fcb0b7f9bf8b94fe82b02ed577))
* :globe_with_meridians: All english for dso-console ([6d45cba](https://github.com/dnum-mi/dso-console/commit/6d45cba12a6540dd13a933f6940b91701dbdab34))
* :green_heart: Fix e2e tests in ci & improve code structure ([0857f70](https://github.com/dnum-mi/dso-console/commit/0857f703f0445cd49940d3337c4d94c9af4c70ea))
* :lock: add binding in sql request to avoid sql injection ([46f5d04](https://github.com/dnum-mi/dso-console/commit/46f5d048e9df384c8f116bfdd8c9b7005160b5bf))
* :loud_sound: Add logs for investigation ([b8f4867](https://github.com/dnum-mi/dso-console/commit/b8f48679f350ef34e856925fc9ff42ecfa1f281a))
* :memo: Last review ([f37ad55](https://github.com/dnum-mi/dso-console/commit/f37ad5549d4e863cc78ed970c0525b4ed421b7f1))
* :package: add jmespath lib ([5fcdd41](https://github.com/dnum-mi/dso-console/commit/5fcdd41c74ca678ce8cdfa79e5626d4eaeaba14c))
* :pencil2: Typo in js ([ef99847](https://github.com/dnum-mi/dso-console/commit/ef99847908ce21cd28bddc8787101d9448c1976d))
* :recycle: Refacto brainstorm thibault ([4e24417](https://github.com/dnum-mi/dso-console/commit/4e24417f7ac7a09dd57aa93f19d174ff679dcf74))
* :rewind: Readd vitest config in shared ([2ec8b14](https://github.com/dnum-mi/dso-console/commit/2ec8b149a8d47136ac8305359688679e1eac1316))
* :rewind: Rebase bug fix ([dbfaa2b](https://github.com/dnum-mi/dso-console/commit/dbfaa2b4732f51d6e1de0f731c55fa25518cc91c))
* :rotating_light: Warn in console for missing required id ([db26c58](https://github.com/dnum-mi/dso-console/commit/db26c587106f1be4bf4765a0ea207adde71bb0ff))
* :technologist: Add env exemple ([64fec78](https://github.com/dnum-mi/dso-console/commit/64fec783624dd4e3a625dbdd16f0bf9736adcc0d))
* :test_tube: (to remove) failing tests skipped ([aeaded1](https://github.com/dnum-mi/dso-console/commit/aeaded1671f5de18d9e613fa32fda162a6147a27))
* :white_check_mark: Correct api call in repo e2e test ([64d5196](https://github.com/dnum-mi/dso-console/commit/64d51968bad97f50f36a1619916b7c2b82378078))
* :white_check_mark: Fix e2e tests on repo ([de0c0a5](https://github.com/dnum-mi/dso-console/commit/de0c0a59e02b639a67066c28b9532a5d38e12e98))
* :zap: remove ansible legacy from server ([68c9dc9](https://github.com/dnum-mi/dso-console/commit/68c9dc9100aff3e71ccdab18608f61f9420e720f))
* conf keycloak for cors from localhost:8080 ([1e06ff0](https://github.com/dnum-mi/dso-console/commit/1e06ff033094024d4e1a4f66bab5443b4505247c))
* login on keycloack TEST ([c983eed](https://github.com/dnum-mi/dso-console/commit/c983eedccdba49d024ba6e5726f69afd33e577a1))
* **projectInit:** :bricks: Add ports in vite config ([5de6e86](https://github.com/dnum-mi/dso-console/commit/5de6e86e02343ff910023681960e3bf7a788becd))
* **projectInit:** :bug: Add context in docker-compose ([3ac3a72](https://github.com/dnum-mi/dso-console/commit/3ac3a7297c1b81fdb93ed099605ceeb2044ad617))
* **projectInit:** :hammer: Fix run test script for client ([272f007](https://github.com/dnum-mi/dso-console/commit/272f007803d35e2113646d57b715e84249fa65bf))
* remove double code in dockerfile ([2951672](https://github.com/dnum-mi/dso-console/commit/29516725acf793168854296f6f35088ef5b3447c))
* rename and add volumes for keycloak ([3d0d999](https://github.com/dnum-mi/dso-console/commit/3d0d999630906223e8cb89fa51b31022e04e1659))
* run cypress in container ([4589169](https://github.com/dnum-mi/dso-console/commit/4589169d0bb0fd1c368c08869e80251d0d5f691a))
* run with delay 10 second to wait keycloak initialize ([b736991](https://github.com/dnum-mi/dso-console/commit/b736991208b9a5fc0880fba294fa96dc073f4c8a))
* update gitignore for all node_modules ([3988743](https://github.com/dnum-mi/dso-console/commit/39887438eceefe4b08b80ad056f2992baaf78494))
* update implicit flow in  config keycloak ([06d2f77](https://github.com/dnum-mi/dso-console/commit/06d2f77fcc07db2de780867b0bda1f49294b349e))
* update pnpm lock ([344261d](https://github.com/dnum-mi/dso-console/commit/344261d2e1b37e8df9eed0cca90ed8e21697d17a))


### Reverts

* :recycle: Move code to another git branch ([1c632c7](https://github.com/dnum-mi/dso-console/commit/1c632c715ffc01100d75c46c1e84a565195a10b3))
