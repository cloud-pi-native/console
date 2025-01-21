# Changelog

## [8.23.3](https://github.com/cloud-pi-native/console/compare/v8.23.2...v8.23.3) (2025-01-21)


### Bug Fixes

* :ambulance: fix gitlab ci config file ([2c2a287](https://github.com/cloud-pi-native/console/commit/2c2a287a76723dfffecd9ae892a8897f03aef161))

## [8.23.2](https://github.com/cloud-pi-native/console/compare/v8.23.1...v8.23.2) (2025-01-21)


### Bug Fixes

* :bug: add a better patch capability for kubernetes ([0050394](https://github.com/cloud-pi-native/console/commit/005039450701f9d77a4479487ba872af602ec689))
* :bug: can't retrieved enc ns name for gitops cluster ([dcf3c1a](https://github.com/cloud-pi-native/console/commit/dcf3c1a147755ae698ba09f7bb7d1d79d13cc1d1))
* :triangular_flag_on_post: no more cloned repository at gitlab createProject ([211d070](https://github.com/cloud-pi-native/console/commit/211d070d77802d894c70c584fa2c41e86a297295))

## [8.23.1](https://github.com/cloud-pi-native/console/compare/v8.23.0...v8.23.1) (2025-01-20)


### Bug Fixes

* :ambulance: bad gitlab url fn ([2ec5332](https://github.com/cloud-pi-native/console/commit/2ec5332ce320e40da131ff537974c169716e3ac5))

## [8.23.0](https://github.com/cloud-pi-native/console/compare/v8.22.1...v8.23.0) (2025-01-20)


### Features

* :fire: remove organization feature ([3b331f6](https://github.com/cloud-pi-native/console/commit/3b331f680716880e7ae4e33b6e441452e2816f3c))
* :sparkles: store cluster secret in Vault ([cea79ef](https://github.com/cloud-pi-native/console/commit/cea79efc6ecb4c33d868d7f5044ddc7825c69ed5))


### Bug Fixes

* :bug: test if description is string before using replaceAll function ([d5b1234](https://github.com/cloud-pi-native/console/commit/d5b12342c236dca1231d05528f6ccd7746f62309))

## [8.22.1](https://github.com/cloud-pi-native/console/compare/v8.22.0...v8.22.1) (2025-01-09)


### Bug Fixes

* :zap: package icons in client ([73fa90d](https://github.com/cloud-pi-native/console/commit/73fa90dd8aa0fe9c7fa8075ada31eea39af808e5))
* patch vue-dsfr ([02079aa](https://github.com/cloud-pi-native/console/commit/02079aaf569b80f1a6a245504757524826a7ab3c))

## [8.22.0](https://github.com/cloud-pi-native/console/compare/v8.21.0...v8.22.0) (2025-01-08)


### Features

* :sparkles: store cluster secret in Vault ([3935ca6](https://github.com/cloud-pi-native/console/commit/3935ca68cb0927bf150e15c3b205baebafa5cb98))
* track project version provisioning ([227baf6](https://github.com/cloud-pi-native/console/commit/227baf6802687c9555d3931071a7e049d2756db1))


### Bug Fixes

* :bug: downgrade gitlab lib to avoid upsert user warning ([90faeff](https://github.com/cloud-pi-native/console/commit/90faeff2978e0ee2db7624b895550db278aa9c17))
* :bug: nexus auto disable repo config on delete ([1295ece](https://github.com/cloud-pi-native/console/commit/1295ece0312a6c7b319c379e88be1ee570d75499))

## [8.21.0](https://github.com/cloud-pi-native/console/compare/v8.20.0...v8.21.0) (2024-12-16)


### Features

* :construction: zone kv store management ([628a6e5](https://github.com/cloud-pi-native/console/commit/628a6e57cb439c8b899acdb8bf1995eedbe0a184))


### Bug Fixes

* :bug: fix not displaying swagger ([6f708a1](https://github.com/cloud-pi-native/console/commit/6f708a150402835c4ef044bdb8e69f20dfe3ee32))
* :bug: retry delete project is failed ([c5856fa](https://github.com/cloud-pi-native/console/commit/c5856fadc49acd238ee61d289cf8441a5b3a2e18))

## [8.20.0](https://github.com/cloud-pi-native/console/compare/v8.19.1...v8.20.0) (2024-11-25)


### Features

* :sparkles: bulk actions on projects ([951fc15](https://github.com/cloud-pi-native/console/commit/951fc152016e00e3bac6cb1d9920998e3cfb4a80))

## [8.19.1](https://github.com/cloud-pi-native/console/compare/v8.19.0...v8.19.1) (2024-11-23)


### Bug Fixes

* :ambulance: broken admin token ([a1eff7f](https://github.com/cloud-pi-native/console/commit/a1eff7f96c6793338019eea0676b8f6dea4c0056))

## [8.19.0](https://github.com/cloud-pi-native/console/compare/v8.18.2...v8.19.0) (2024-11-22)


### Features

* :art: use upsert zone hook to manage infra repo ([6fe47d1](https://github.com/cloud-pi-native/console/commit/6fe47d1922359c4934b5364fa3d87dd86cec129b))
* :sparkles: easy in-cluster config ([01435e2](https://github.com/cloud-pi-native/console/commit/01435e2595383b4be00bdafb45970161765da6b9))
* :sparkles: enable pwa on frontend ([c6c03f3](https://github.com/cloud-pi-native/console/commit/c6c03f3dadf9e954353ad11c29c19d50538d1e2a))


### Bug Fixes

* :bug: vault forgot to set kv to v2 ([90dca64](https://github.com/cloud-pi-native/console/commit/90dca64aca9d64b8491b332d0151f1be68dcbccc))

## [8.18.2](https://github.com/cloud-pi-native/console/compare/v8.18.1...v8.18.2) (2024-11-20)


### Bug Fixes

* :bug: fix vault detect api hashicorp ([86959f5](https://github.com/cloud-pi-native/console/commit/86959f5874f60e898442ba4f734ff1a5581998a6))

## [8.18.1](https://github.com/cloud-pi-native/console/compare/v8.18.0...v8.18.1) (2024-11-20)


### Bug Fixes

* :ambulance: fix pat migration ([df3f699](https://github.com/cloud-pi-native/console/commit/df3f699ddc972a2b2001a20d5e31dd5ba9ad7482))

## [8.18.0](https://github.com/cloud-pi-native/console/compare/v8.17.2...v8.18.0) (2024-11-20)


### Features

* :sparkles: build project kv with config for projects ([f1c687f](https://github.com/cloud-pi-native/console/commit/f1c687f55ee4c8b8c2f342e431fb3f0982ffd72c))
* ✨ add PAT ([2c35cd7](https://github.com/cloud-pi-native/console/commit/2c35cd72a1d0fb14f8c1a633b86e7ef00da80bab))


### Bug Fixes

* :bug: fix weird front behviours ([e06cf11](https://github.com/cloud-pi-native/console/commit/e06cf117c0fef4f49749d80a7ac5b8de813c6ed7))

## [8.17.2](https://github.com/cloud-pi-native/console/compare/v8.17.1...v8.17.2) (2024-11-14)


### Bug Fixes

* :zap: disallow recursive list to avoid big latency ([1fed78c](https://github.com/cloud-pi-native/console/commit/1fed78c1742b70918c9bab1ff616f0cf681d66fa))

## [8.17.1](https://github.com/cloud-pi-native/console/compare/v8.17.0...v8.17.1) (2024-11-08)


### Bug Fixes

* :ambulance: fix not displayed repositories in admin view ([48c0a92](https://github.com/cloud-pi-native/console/commit/48c0a92339db999c598fe24cdc9302b28cffa14d))
* :ambulance: internal gitlab url ([16f195e](https://github.com/cloud-pi-native/console/commit/16f195e55222de023046aaabefa9b6d7f79062ee))

## [8.17.0](https://github.com/cloud-pi-native/console/compare/v8.16.0...v8.17.0) (2024-11-07)


### Features

* :sparkles: config items section ([7c41eea](https://github.com/cloud-pi-native/console/commit/7c41eeaec2855355c0fa683d4b7ec81210eae6af))
* :sparkles: hooks returned store accept null ([1255a32](https://github.com/cloud-pi-native/console/commit/1255a32237a6775e465fc0efe4dfe10bc9463816))
* :sparkles: nexus fine write policy ([14897e6](https://github.com/cloud-pi-native/console/commit/14897e685ff6665da35464d93571a972e2c8dae9))
* :sparkles: record and display last time a user logged ([1e8323b](https://github.com/cloud-pi-native/console/commit/1e8323bbfcd611891fe741434d4cb5f780f45dec))
* gitlab optional internal url ([c1643a1](https://github.com/cloud-pi-native/console/commit/c1643a1eaae350220c4ecf114c7fa16bfb1983a1))

## [8.16.0](https://github.com/cloud-pi-native/console/compare/v8.15.1...v8.16.0) (2024-11-06)


### Features

* :lipstick: disable cluster selection when creating a zone ([a8bb19c](https://github.com/cloud-pi-native/console/commit/a8bb19cb4ff50b69b892547e05b1541e322b0ecd))
* :lipstick: user list rework ([5c13b9d](https://github.com/cloud-pi-native/console/commit/5c13b9d756c549a2f12d99e7f7384690f3166553))
* :sparkles: nexus customizable write policy ([78a004b](https://github.com/cloud-pi-native/console/commit/78a004bc72e97b3a98c963560e8c11db45b34b67))


### Bug Fixes

* :bug: minors plugins fix and front ([22937c8](https://github.com/cloud-pi-native/console/commit/22937c875480dc0b6bf67f0784311f98300df04d))

## [8.15.1](https://github.com/cloud-pi-native/console/compare/v8.15.0...v8.15.1) (2024-10-29)


### Bug Fixes

* :bug: update depracated import assertion type syntax ([d8f2072](https://github.com/cloud-pi-native/console/commit/d8f20728a0d96c6799e5bba7e821ed12356d6393))

## [8.15.0](https://github.com/cloud-pi-native/console/compare/v8.14.0...v8.15.0) (2024-10-29)


### Features

* :lipstick: adding the project id in namespace labels ([eace611](https://github.com/cloud-pi-native/console/commit/eace611838cd2a5ce0e457971914c9d3bf29e6d0))
* 🚸 rework project selection ([1641fc9](https://github.com/cloud-pi-native/console/commit/1641fc974f455734bedeb0cf2fdaf7356c9b850b))

## [8.14.0](https://github.com/cloud-pi-native/console/compare/v8.13.2...v8.14.0) (2024-10-17)


### Features

* :lipstick: add argocd urls for each zone ([cf467ae](https://github.com/cloud-pi-native/console/commit/cf467aeaf82c44099f8b964dd4ef2e00a5323a90))
* :sparkles: add npm support in npm ([60b7752](https://github.com/cloud-pi-native/console/commit/60b7752fd31ca36860e64df9b320d8468163d0d4))
* :sparkles: introduce warn status on project ([9d69357](https://github.com/cloud-pi-native/console/commit/9d69357fde2014c1fe134803f8361680bac1d3fc))
* :sparkles: keycloak client management for configuring sso oidc of each argocd zone ([44b3b06](https://github.com/cloud-pi-native/console/commit/44b3b06e3882fe2a60691a8bd29572e023b32146))
* :sparkles: return warns and errors message from plugins to user ([be4443f](https://github.com/cloud-pi-native/console/commit/be4443fc10db5669578279fbcbac2b4d67adcb52))
* :sparkles: show short logs about project to users ([4888e64](https://github.com/cloud-pi-native/console/commit/4888e64527d2627fc2e320300a39745e2571b73c))

## [8.13.2](https://github.com/cloud-pi-native/console/compare/v8.13.1...v8.13.2) (2024-10-02)


### Bug Fixes

* :ambulance: no check on api response ([cfc56db](https://github.com/cloud-pi-native/console/commit/cfc56db5b4cdab03b3515d2cae1477e7546dfef8))

## [8.13.1](https://github.com/cloud-pi-native/console/compare/v8.13.0...v8.13.1) (2024-09-27)


### Bug Fixes

* :loud_sound: change log logic in sonarqube plugin ([5006562](https://github.com/cloud-pi-native/console/commit/500656244f12d0d1edeb995e30be8cfa95ca8a4f))

## [8.13.0](https://github.com/cloud-pi-native/console/compare/v8.12.3...v8.13.0) (2024-09-27)


### Features

* :loud_sound: add logger object ([02c6715](https://github.com/cloud-pi-native/console/commit/02c67150d738ae200f8937adb88bf32001ff2b8c))
* :sparkles: plugins can return warning to not interupt hook ([3e132c3](https://github.com/cloud-pi-native/console/commit/3e132c3238cc98d1d75ec956ce55efebe2c5304a))


### Bug Fixes

* :bug: change imports exports to not use z.lazy, fix swagger-ui ([64a60fe](https://github.com/cloud-pi-native/console/commit/64a60fe6bc84ea9de51519049252957726963afa))
* :bug: dsfr tabs require rewrite DsoHome.vue ([ea03623](https://github.com/cloud-pi-native/console/commit/ea0362303757ac239e5b753af6777514cb714b03))

## [8.12.3](https://github.com/cloud-pi-native/console/compare/v8.12.2...v8.12.3) (2024-09-19)


### Bug Fixes

* :passport_control: allow more actions to admin token ([81fa606](https://github.com/cloud-pi-native/console/commit/81fa60653e2bfbcb37251bda448ea3d2f9805eb3))

## [8.12.2](https://github.com/cloud-pi-native/console/compare/v8.12.1...v8.12.2) (2024-09-19)


### Bug Fixes

* :ambulance: cbx not checked cause vuedsfr breaking change ([c7e607f](https://github.com/cloud-pi-native/console/commit/c7e607fa6a373866489d7e72e7234107d76a3b7e))

## [8.12.1](https://github.com/cloud-pi-native/console/compare/v8.12.0...v8.12.1) (2024-09-17)


### Bug Fixes

* :bug: fix behaviour of complex querying on user list ([b63bd9a](https://github.com/cloud-pi-native/console/commit/b63bd9a56c118fe52ab38589a28c90777c5a557e))

## [8.12.0](https://github.com/cloud-pi-native/console/compare/v8.11.1...v8.12.0) (2024-09-17)


### Features

* :sparkles: add admins api tokens ([e141642](https://github.com/cloud-pi-native/console/commit/e141642eb2b717c29cf91f482e91761e7ce4bfa8))
* :sparkles: add users search filter (admin) ([cc1ab56](https://github.com/cloud-pi-native/console/commit/cc1ab56b2ac496ffd01196ee4d97362ab7a08e03))

## [8.11.1](https://github.com/cloud-pi-native/console/compare/v8.11.0...v8.11.1) (2024-09-02)


### Bug Fixes

* :lipstick: better repo ui ([084fc91](https://github.com/cloud-pi-native/console/commit/084fc91332fbdd6052cadbde204df77cd772a07d))

## [8.11.0](https://github.com/cloud-pi-native/console/compare/v8.10.1...v8.11.0) (2024-08-29)


### Features

* :sparkles: standalone repo ([ea9a2ba](https://github.com/cloud-pi-native/console/commit/ea9a2bac3fc9696fde6f1ae56b916e180ae19039))


### Bug Fixes

* :ambulance: edit previous migrations ([2a87288](https://github.com/cloud-pi-native/console/commit/2a87288ea99c19df706fe2f68173ba4bea919a17))


### Performance Improvements

* :zap: avoid unuseful keycloak call and auto-refresh ([8dcb1c2](https://github.com/cloud-pi-native/console/commit/8dcb1c24e9cce760e278222dcb84c62dff4118a1))

## [8.10.1](https://github.com/cloud-pi-native/console/compare/v8.10.0...v8.10.1) (2024-08-27)


### Bug Fixes

* :ambulance: missed admin authorized to remove a member ([15eafa9](https://github.com/cloud-pi-native/console/commit/15eafa9996d7e1f827f5eb1cf6aef425f4620a2b))

## [8.10.0](https://github.com/cloud-pi-native/console/compare/v8.9.4...v8.10.0) (2024-08-26)


### Features

* :sparkles: add project dedicated approle and policy in vault, to be used by argocd ([e354978](https://github.com/cloud-pi-native/console/commit/e354978392b8c5d7a4c3591388f0f0a9aa3d7865))
* :sparkles: introduce fine grained perms and and roles ([ab0a7a5](https://github.com/cloud-pi-native/console/commit/ab0a7a55e42ef94a18e529b168d5f299687ca526))
* :sparkles: maintenance mode ([fdbd5f0](https://github.com/cloud-pi-native/console/commit/fdbd5f0356a16c24ef677f8a06309aac89af3a4c))
* :sparkles: option to mirror all branches ([655b032](https://github.com/cloud-pi-native/console/commit/655b0329599fe7e0857e487e3b0fd3ecb49b94ac))

## [8.9.4](https://github.com/cloud-pi-native/console/compare/v8.9.3...v8.9.4) (2024-08-09)


### Bug Fixes

* :ambulance: handle missing commit in gitlab repo ([2ef9930](https://github.com/cloud-pi-native/console/commit/2ef993001770e76be5bdf2795a0cbe8e302cf71a))

## [8.9.3](https://github.com/cloud-pi-native/console/compare/v8.9.2...v8.9.3) (2024-08-08)


### Bug Fixes

* :ambulance: fix error on getArgoRepo when the infra repository is empty (zero commit) ([bf3f3f1](https://github.com/cloud-pi-native/console/commit/bf3f3f10c0e50eaf2f2b788b587c04e27f1eff00))

## [8.9.2](https://github.com/cloud-pi-native/console/compare/v8.9.1...v8.9.2) (2024-07-19)


### Bug Fixes

* :ambulance: clone private repositories in gitlab plugin ([d42bbf8](https://github.com/cloud-pi-native/console/commit/d42bbf8a02950a6f9d0d3218bd7bc40cec203843))

## [8.9.1](https://github.com/cloud-pi-native/console/compare/v8.9.0...v8.9.1) (2024-07-18)


### Bug Fixes

* :bug: search on HEAD ref instead of main ([ac13b5f](https://github.com/cloud-pi-native/console/commit/ac13b5fca8c952841e162ed300fdce099c74ac9b))

## [8.9.0](https://github.com/cloud-pi-native/console/compare/v8.8.2...v8.9.0) (2024-07-17)


### Features

* :rocket: add helm detection and list values files ([006ccba](https://github.com/cloud-pi-native/console/commit/006ccbaa6d4710af8f1495ae8dadccf729b7dcc6))

## [8.8.2](https://github.com/cloud-pi-native/console/compare/v8.8.1...v8.8.2) (2024-07-15)


### Bug Fixes

* :art: harmonize hook calling in business ([4effaab](https://github.com/cloud-pi-native/console/commit/4effaab7f9c80561d0fd52e365822d806a5426f5))
* :bug: don't ignore user token when testing cluster deployment mode ([cc488c3](https://github.com/cloud-pi-native/console/commit/cc488c3053fadffba040f8396eebfa27bf6c1f79))
* :bug: env name error not displayed ([d2f84e8](https://github.com/cloud-pi-native/console/commit/d2f84e822b94074615df3385f0c088582ceaf3cf))
* :bug: require tls serverName ([9d4dea2](https://github.com/cloud-pi-native/console/commit/9d4dea22e68aab7ef6ee6b74a16e92a397002709))

## [8.8.1](https://github.com/cloud-pi-native/console/compare/v8.8.0...v8.8.1) (2024-07-09)


### Bug Fixes

* :ambulance: not ready for project reponse validation ([c77dd68](https://github.com/cloud-pi-native/console/commit/c77dd6889886b3c867294437e5377573771a7ff0))
* :ambulance: second try to fix ([1ef6244](https://github.com/cloud-pi-native/console/commit/1ef6244d7536de5704ec6fc9a83b0cfc5d806147))

## [8.8.1](https://github.com/cloud-pi-native/console/compare/v8.8.0...v8.8.1) (2024-07-09)


### Bug Fixes

* :ambulance: not ready for project reponse validation ([c77dd68](https://github.com/cloud-pi-native/console/commit/c77dd6889886b3c867294437e5377573771a7ff0))

## [8.8.0](https://github.com/cloud-pi-native/console/compare/v8.7.1...v8.8.0) (2024-07-09)


### Features

* :sparkles: query filter admin projects ([feb701d](https://github.com/cloud-pi-native/console/commit/feb701d9d36db0120032f0c1f8888a893c799495))

## [8.7.1](https://github.com/cloud-pi-native/console/compare/v8.7.0...v8.7.1) (2024-07-05)


### Bug Fixes

* :bug: insert user when first accessing admin pages ([095b9de](https://github.com/cloud-pi-native/console/commit/095b9de4e282712919e932bf67b15fdaeec96932))
* :lipstick: repo should be able to change infra, not infra ([1069728](https://github.com/cloud-pi-native/console/commit/10697280499b44b1a1eef28a71d510bfe8916cf3))

## [8.7.0](https://github.com/cloud-pi-native/console/compare/v8.6.0...v8.7.0) (2024-07-03)


### Features

* :necktie: hide private quotas for all on environment form ([ef08f29](https://github.com/cloud-pi-native/console/commit/ef08f29080d2be32236839be1e402fe76f44f465))


### Bug Fixes

* :lock: serialize sevice monitor response ([26ee98f](https://github.com/cloud-pi-native/console/commit/26ee98fa21984e57eaae8251dc14394f0e94c4b9))

## [8.6.0](https://github.com/cloud-pi-native/console/compare/v8.5.0...v8.6.0) (2024-06-28)


### Features

* :art: change subpath of deployments ([d7b57ca](https://github.com/cloud-pi-native/console/commit/d7b57ca095bcb1ae8fcde5ead7a533b0f0ce81e5))
* :sparkles: add user leo poumailloux ([0147e07](https://github.com/cloud-pi-native/console/commit/0147e071bbdfbb8c666d20247bd95938f645f152))
* :sparkles: give project ownership ([dc6fa79](https://github.com/cloud-pi-native/console/commit/dc6fa798fe2fe37395c521482bbc857eb74b50d1))
* :sparkles: truncate description ([8191a41](https://github.com/cloud-pi-native/console/commit/8191a41ae808980d400f1e65499e012d0d192c28))


### Bug Fixes

* :bug: handle vault ha for status monitor ([3692e01](https://github.com/cloud-pi-native/console/commit/3692e010d9d4c0c03e8403b4d5df3591f0312209))
* :bug: interface suppression & add explication ([4476c9b](https://github.com/cloud-pi-native/console/commit/4476c9bacdcc748ca0d2d1029f8980392a2ea068))
* :bug: isolation des groupes d'envs dans keycloak ([91b5d55](https://github.com/cloud-pi-native/console/commit/91b5d551a88f5059868a80271be5b37c451839d0))
* :bug: prevent env deletion if project is locked ([d75a5cf](https://github.com/cloud-pi-native/console/commit/d75a5cfc4e86741a91ba31d0c2d2fc2b21fa5226))
* :bug: prevent env deletion if project is locked ([a273869](https://github.com/cloud-pi-native/console/commit/a273869ba421ee37fc342c585c38c978aab5d411))
* :bug: support slashes in syncRepository branchName ([d304427](https://github.com/cloud-pi-native/console/commit/d304427c8bd0af8e7080ec9480143d0abab3bb76))

## [8.5.0](https://github.com/cloud-pi-native/console/compare/v8.4.1...v8.5.0) (2024-06-10)


### Features

* :sparkles: add text filter for admin user list ([d44f142](https://github.com/cloud-pi-native/console/commit/d44f142e9f559f7714e3eb71650c1dd3c8a325cd))
* :sparkles: allow harbor quota limit ([9644d03](https://github.com/cloud-pi-native/console/commit/9644d037ea2642ba9e456e362c18a1eed520b66b))
* :sparkles: argocd extra repositories ([303f4a2](https://github.com/cloud-pi-native/console/commit/303f4a2fac89ce511aeac9cf87dbf6221908e373))


### Bug Fixes

* :bug: keycloak crashed when more than 10 environments ([f3d4f5d](https://github.com/cloud-pi-native/console/commit/f3d4f5d3cc5b49946cc4e1ab969895229524f335))
* :bug: manage if no users in project ([cd23a59](https://github.com/cloud-pi-native/console/commit/cd23a5940eddf1d8509bf7594842db5bcc5fa1ae))
* :bug: why is it useful ? ([ee2bf5c](https://github.com/cloud-pi-native/console/commit/ee2bf5ce588a92b303b3af8db2bf24ed999822eb))

## [8.4.1](https://github.com/cloud-pi-native/console/compare/v8.4.0...v8.4.1) (2024-05-31)


### Bug Fixes

* :bug: add try catch to parsing plugin error ([b958529](https://github.com/cloud-pi-native/console/commit/b95852942863f75eda7458e7593e09579c7811d5))

## [8.4.0](https://github.com/cloud-pi-native/console/compare/v8.3.0...v8.4.0) (2024-05-29)


### Features

* :sparkles: create a user usable robot for harbor ([a71dfc9](https://github.com/cloud-pi-native/console/commit/a71dfc992b62a6c3c69dcc6d7de98b8d2d72a79c))
* :sparkles: customize keycloak theme ([7c21375](https://github.com/cloud-pi-native/console/commit/7c21375d1ad56a03f84c25d04cbe0ada7eac8d5c))
* :sparkles: option for gitlab display secret ([28d3ebc](https://github.com/cloud-pi-native/console/commit/28d3ebce4d6912904e1f21cd3c126ca342fc3cfb))


### Bug Fixes

* :art: squash const ([cd1be8c](https://github.com/cloud-pi-native/console/commit/cd1be8c8f282be045ffce473387b21ed95355f5e))
* :bug: fallback if no owners are found ([629ef40](https://github.com/cloud-pi-native/console/commit/629ef40afb3c6ff0a22b0f17c2c86a343463a8ba))
* :bug: missing await and ambiguous message ([0530b45](https://github.com/cloud-pi-native/console/commit/0530b4520a5bc05d6a45f9f76029c898f960ee34))
* :bug: update cluster logic ([65ba7e1](https://github.com/cloud-pi-native/console/commit/65ba7e10f0d7dd9e1675da633c922fff8499ee95))

## [8.3.0](https://github.com/cloud-pi-native/console/compare/v8.2.2...v8.3.0) (2024-05-16)


### Features

* :sparkles: handle keycloak admin group membership from console ([4741878](https://github.com/cloud-pi-native/console/commit/4741878fdfa4d784ed2e7695407ebce6b00b4850))


### Bug Fixes

* :ambulance: possible missed clusters in payload ([47efcc8](https://github.com/cloud-pi-native/console/commit/47efcc893f272823b5d7d7f4b78b9c29ddad9095))
* :ambulance: unhandled promise gitlab ([592035c](https://github.com/cloud-pi-native/console/commit/592035c95605f004e62cba71faff36ea189d6173))

## [8.2.2](https://github.com/cloud-pi-native/console/compare/v8.2.1...v8.2.2) (2024-05-13)


### Bug Fixes

* :bug: fix update cluster ([f02958c](https://github.com/cloud-pi-native/console/commit/f02958ca3888fdb452a545fd94b8d20f9ebb93ed))
* :bug: stores should have unique names ([6e8032a](https://github.com/cloud-pi-native/console/commit/6e8032a68b71d7ea86b8153d0984013e5bd4c8df))

## [8.2.1](https://github.com/cloud-pi-native/console/compare/v8.2.0...v8.2.1) (2024-05-06)


### Bug Fixes

* :fire: remove unjustified refine ([9b1d41e](https://github.com/cloud-pi-native/console/commit/9b1d41ec402446678518bb39c0f3cff543afceb3))
* :mute: remove problematic log ([639e982](https://github.com/cloud-pi-native/console/commit/639e982df49ccb5888adb26f3a0b1ca62fe53973))

## [8.2.0](https://github.com/cloud-pi-native/console/compare/v8.1.1...v8.2.0) (2024-05-03)


### Features

* :sparkles: adding the value file commit ([6ea872b](https://github.com/cloud-pi-native/console/commit/6ea872b498e658113983cdc2b80d9d2ca3cf770d))
* :sparkles: can configure plugins globally or by project ([15b66c1](https://github.com/cloud-pi-native/console/commit/15b66c1be31311e3b6062c3d771fb3ecc3dcbfa8))


### Bug Fixes

* :bug: override plugins unzip if already exists ([ff65133](https://github.com/cloud-pi-native/console/commit/ff651332fcee6ae752bdf4533ebbb88f216bfe95))

## [8.1.1](https://github.com/cloud-pi-native/console/compare/v8.1.0...v8.1.1) (2024-04-24)


### Bug Fixes

* :ambulance: correct sql query for zoneId ([c47dae4](https://github.com/cloud-pi-native/console/commit/c47dae4a4f74cd51e6c9fe19856d4b8eea08cbb8))

## [8.1.0](https://github.com/cloud-pi-native/console/compare/v8.0.3...v8.1.0) (2024-04-24)


### Features

* :safety_vest: allow unlogged users to access services health ([e2fc942](https://github.com/cloud-pi-native/console/commit/e2fc9423b107f1afd9fdbe1b017b7dd1f3d2eab1))
* :safety_vest: check existing zone slug before creating one ([072fffb](https://github.com/cloud-pi-native/console/commit/072fffbd1d4788329fb76b927242854feb25d31b))
* :sparkles: add zones ([53d155f](https://github.com/cloud-pi-native/console/commit/53d155f244a846e0cf23d3cf75528e6d937fe0ce))
* :sparkles: allow repo sync from console ui ([1cd1c93](https://github.com/cloud-pi-native/console/commit/1cd1c93a9e1d95663e51f4de24a5b518fa2bee1a))
* :sparkles: display project services in admin view ([a5d53fd](https://github.com/cloud-pi-native/console/commit/a5d53fd586dd912b13b72196ed99c2354c022448))


### Bug Fixes

* :bug: app version in client footer ([ac2f26e](https://github.com/cloud-pi-native/console/commit/ac2f26e88ca3fa593668d4f9641465b09855c663))
* :bug: get only client app version from env on production build ([3bb3017](https://github.com/cloud-pi-native/console/commit/3bb3017f968e8e93b955b33cb494d51ecce5521a))
* :bug: handle stage and zone changes in environment form ([5aa0a58](https://github.com/cloud-pi-native/console/commit/5aa0a585e9903e0a29f7bec29e4a08090109542b))

## [8.0.3](https://github.com/cloud-pi-native/console/compare/v8.0.2...v8.0.3) (2024-04-16)


### Bug Fixes

* :ambulance: gitlab secret ([0c03a95](https://github.com/cloud-pi-native/console/commit/0c03a9551377705fced2dedf1b9e8063df9d2748))

## [8.0.2](https://github.com/cloud-pi-native/console/compare/v8.0.1...v8.0.2) (2024-04-11)


### Bug Fixes

* :lock: remove old robot permission that harbor does not support anymore ([1d988ce](https://github.com/cloud-pi-native/console/commit/1d988ce86b6b338a576d517816f013295b2f18d3))

## [8.0.1](https://github.com/cloud-pi-native/console/compare/v8.0.0...v8.0.1) (2024-04-04)


### Bug Fixes

* :ambulance: change kubernetes logic ([3679c22](https://github.com/cloud-pi-native/console/commit/3679c2221c961b4887e1191229edaacd6e34649b))

## [8.0.0](https://github.com/cloud-pi-native/console/compare/v7.0.1...v8.0.0) (2024-04-02)


### ⚠ BREAKING CHANGES

* :sparkles: simplify hooks for idempotency

### Features

* :safety_vest: allow + sign for repo externalUserName ([4a695ef](https://github.com/cloud-pi-native/console/commit/4a695eff71ea6a03f839d19d2e2526180ea5161b))
* :sparkles: add replay hooks button for project ([9147231](https://github.com/cloud-pi-native/console/commit/91472317ebd112b4f360d859d25d8793c89eb331))
* :sparkles: add sonar properties var file to gitlab ([0462a36](https://github.com/cloud-pi-native/console/commit/0462a364b54e66639ade6997f6f4c48e9fe305c6))
* :sparkles: simplify hooks for idempotency ([aac0a2d](https://github.com/cloud-pi-native/console/commit/aac0a2d331acd4e86531591de99cc944584f7684))
* 🚧 création du repo infra-apps à la création du projet ([17007f7](https://github.com/cloud-pi-native/console/commit/17007f7eb0bb8c9ba612cf70536236b428b801da))


### Bug Fixes

* :ambulance: gitlab plugin deleted public repo secret ([46002b0](https://github.com/cloud-pi-native/console/commit/46002b007e9dfd69ce5daeee33cfd61164e0ed8e))
* :ambulance: gitlab plugin deleted public repo secret ([353f43e](https://github.com/cloud-pi-native/console/commit/353f43eba74d5d0b0a95ace2ee65d9c51c0685b7))
* :bug: reload user projects after hooks replay ([ae57ed0](https://github.com/cloud-pi-native/console/commit/ae57ed017dac4e5601cdf80a02598967bf75364b))
* :lipstick: improve logs ui ([ec6ecb2](https://github.com/cloud-pi-native/console/commit/ec6ecb283f0c7c37589c02e194f1b101e9dc10c2))
* :zap: manage hook concurrency execution ([6af135f](https://github.com/cloud-pi-native/console/commit/6af135f0548d232ef5bd190375057da0968d8f94))

## [7.0.1](https://github.com/cloud-pi-native/console/compare/v7.0.0...v7.0.1) (2024-03-18)


### Bug Fixes

* :bug: add a common error parser for logs ([2391439](https://github.com/cloud-pi-native/console/commit/2391439ef6147119863278bd69ac01797b368f76))
* :bug: add a common error parser for logs ([b6f28d7](https://github.com/cloud-pi-native/console/commit/b6f28d738c03c3c023d16cf658de8cdc384aa6df))
* :bug: correctly handle external plugins init ([91e5d7f](https://github.com/cloud-pi-native/console/commit/91e5d7f27f90c1e249ed9e295b05400f06565c2d))
* :green_heart: fix ci-cd build and release ([a036562](https://github.com/cloud-pi-native/console/commit/a036562f005ba0550c4bf25248227aee02357371))

## [7.0.0](https://github.com/cloud-pi-native/console/compare/console-v6.5.1...console-v7.0.0) (2024-03-13)


### ⚠ BREAKING CHANGES

* :art: split plugins
* :boom: environment management

### Features

* :alien: synch controllers with plugin calls ([d0a271d](https://github.com/cloud-pi-native/console/commit/d0a271d188840d8682b6abe412ee8da4db7992b1))
* :boom: environment management ([b4f3793](https://github.com/cloud-pi-native/console/commit/b4f379315803aee1264192c16851af049fa661ee))
* :children_crossing: add confirm box for updating an organization ([5c3cd20](https://github.com/cloud-pi-native/console/commit/5c3cd207221a22ed5d93bdf8638b23c9849897f6))
* :children_crossing: add default branch to sync in mirror pipeline ([45dbc01](https://github.com/cloud-pi-native/console/commit/45dbc01c4a95d04a201b2c5e198e3b192e1e5fe2))
* :children_crossing: add filtering on admin projects view ([dc5412c](https://github.com/cloud-pi-native/console/commit/dc5412c1a80ce84cd563376a0b7f72da7926a858))
* :children_crossing: better ux for forms in tiles ([da68243](https://github.com/cloud-pi-native/console/commit/da68243a91865732db46b9ae610a82eeec5c9bf2))
* :children_crossing: improve home page and update doc link ([038d982](https://github.com/cloud-pi-native/console/commit/038d982ead7bbfa70debdf902d5c46e8518c1e60))
* :children_crossing: inform users that clipboard works only with https ([909c3b6](https://github.com/cloud-pi-native/console/commit/909c3b672bcae1401d2133c8fff94cdca91f61bc))
* :closed_lock_with_key: retrieve project secrets from vault and display it in front ([201435d](https://github.com/cloud-pi-native/console/commit/201435d18047400ec9fe4252b6be2c11dbd57068))
* :closed_lock_with_key: retrieve project secrets from vault and display it in front ([201435d](https://github.com/cloud-pi-native/console/commit/201435d18047400ec9fe4252b6be2c11dbd57068))
* :iphone: more responsive sideMenu and permissionForm ([c840306](https://github.com/cloud-pi-native/console/commit/c8403067224b5ad90e34b8233a1830ceeec8b715))
* :loud_sound: add payload and full hook response in validation hooks ([adabb02](https://github.com/cloud-pi-native/console/commit/adabb02fd0b8028b1fcdf1113744234a925d72ce))
* :loud_sound: add reqId in db logs ([2b7f22b](https://github.com/cloud-pi-native/console/commit/2b7f22b7e24748dc37c8623bbda3e914ed7cae00))
* :necktie: do not fail and lock project for membership reasons ([91038d5](https://github.com/cloud-pi-native/console/commit/91038d5ed3533e4d4eacb8eac3539f29a60ab091))
* :passport_control: update harbor project member role ([4419dd5](https://github.com/cloud-pi-native/console/commit/4419dd5f395f79a9eb99e8c0f305a7433ad84f7e))
* :safety_vest: update password character support ([c82f35f](https://github.com/cloud-pi-native/console/commit/c82f35fb7f20ad06c0a63eb518407d17ddb88b51))
* :sparkles: add backoffice for admins ([fadfdfc](https://github.com/cloud-pi-native/console/commit/fadfdfc43c427261adc3e31dbb1907d6dcefc5cb))
* :sparkles: add infos key for cluster ([25ab8b8](https://github.com/cloud-pi-native/console/commit/25ab8b8d821c37f4491bd8fea075bdc7fbfcfc93))
* :sparkles: add or remove a team member via keycloak ([0563d20](https://github.com/cloud-pi-native/console/commit/0563d20ca93a25decc7dbb5d945e2b738b0d575a))
* :sparkles: add project environments to hook payload ([7aa8117](https://github.com/cloud-pi-native/console/commit/7aa81179ac95afdddf711e1a0a4b3c3a45a35c5a))
* :sparkles: add quota and stage management for admin ([80ce642](https://github.com/cloud-pi-native/console/commit/80ce642b69a5eaaf1b53c7d884b70889c4e71d9d))
* :sparkles: add quotas selection for environment ([bb97f5f](https://github.com/cloud-pi-native/console/commit/bb97f5f17c5e7b497eccb655a6eb5da692f7df73))
* :sparkles: add stage in setPermission payload ([e920805](https://github.com/cloud-pi-native/console/commit/e920805a3181ae98bf98b774d19e02d1e8a2139c))
* :sparkles: add stage management for admin ([e133853](https://github.com/cloud-pi-native/console/commit/e13385347610014a4edcc0b2ff12252386328cb8))
* :sparkles: add tlsServerName input in cluster form ([4bdc01e](https://github.com/cloud-pi-native/console/commit/4bdc01ef9dd5b2041a34491e46b9759e5c6652f0))
* :sparkles: better integration of sonarqube ([c0a0517](https://github.com/cloud-pi-native/console/commit/c0a05173a158b74d752aafaccdff58fc3b29c382))
* :sparkles: delete cluster if no environment suscribed ([8edc50a](https://github.com/cloud-pi-native/console/commit/8edc50a85f266f1135b340d6df39a48ea7ac746b))
* :sparkles: disallow hyphen on project, environment and stage ([f9b05ee](https://github.com/cloud-pi-native/console/commit/f9b05eefee41f7d514d749a0ac3fa1c1d063f051))
* :sparkles: display cluster infos to users on environment form ([4afdf34](https://github.com/cloud-pi-native/console/commit/4afdf34fc40df7789a00fe6d159ee73370b94cb9))
* :sparkles: download projects data button for admins ([cb38e75](https://github.com/cloud-pi-native/console/commit/cb38e7573314ba0980c4161d1a77a9e83fddb236))
* :sparkles: enable admin cluster update ([f81008e](https://github.com/cloud-pi-native/console/commit/f81008e97c25bc73466b6257bd4cb2dc0bde9163))
* :sparkles: handle gitlab membership ([7ff68bd](https://github.com/cloud-pi-native/console/commit/7ff68bdf8f9a16562cfc00fbdb0c322b0f09943d))
* :sparkles: lock and unlock projects according to their org status ([3b9444a](https://github.com/cloud-pi-native/console/commit/3b9444aeaa2fab76461946e9a4d00e8afe4a62f1))
* :sparkles: retrieve user from kc if does not exist in db ([3d4461a](https://github.com/cloud-pi-native/console/commit/3d4461ae7d82e6f64a1644921893d89f41e9a2d9))
* :sparkles: services secrets improvement ([40e3ddd](https://github.com/cloud-pi-native/console/commit/40e3ddd2acd7e000b03f5bfa5663533449d315bf))
* :sparkles: to fn, more infos, multi tiles ([8c4de83](https://github.com/cloud-pi-native/console/commit/8c4de83cf3b4bc0e335292d437ddf7d22305ff93))
* :speech_balloon: translate stage in front for better understanding ([5a66479](https://github.com/cloud-pi-native/console/commit/5a6647980319524098a72fcbd2be6affbda3f3d0))
* :technologist: add images auto-scan to harbor settings ([507c6e6](https://github.com/cloud-pi-native/console/commit/507c6e6a541b19502084276db30cf834e586d955))
* :technologist: add swagger for server api ([abe15d2](https://github.com/cloud-pi-native/console/commit/abe15d2ceb93039ecd795389156f8730e5327841))


### Bug Fixes

* :alien: add owner in archiveProject hookpayload ([5c99183](https://github.com/cloud-pi-native/console/commit/5c99183f03afe0c20980c9649ce37788b833a351))
* :alien: change logo for svg ([aa8315b](https://github.com/cloud-pi-native/console/commit/aa8315b63617c8413a448499e2ab0e68c216faef))
* :alien: fetch does not support proxy natively ([20d531d](https://github.com/cloud-pi-native/console/commit/20d531d622e6fe9e2869e13db0d205b44ad602ce))
* :alien: sync controllers require bigger axios timeout ([5116bbd](https://github.com/cloud-pi-native/console/commit/5116bbdb8f49b73c920ac04421ca05ccabef902c))
* :ambulance: bad logic register plugins ([049040e](https://github.com/cloud-pi-native/console/commit/049040eafda26214afbc2118cb56542b133feca5))
* :ambulance: preserve status colum in project ([febfaff](https://github.com/cloud-pi-native/console/commit/febfaff702d6a55210723ce213d603ad059ceaed))
* :ambulance: register cluster destination via kubeconfig ([0e8d310](https://github.com/cloud-pi-native/console/commit/0e8d3102267268c595d172808e30183dbe4b3aad))
* :ambulance: send internalRepoName to plugins on updateRepository hook ([2bde004](https://github.com/cloud-pi-native/console/commit/2bde0045592f2898975633c0c6f959311234f7f3))
* :art: can disble plugins by name, and some fixes ([f2bd397](https://github.com/cloud-pi-native/console/commit/f2bd397e0526d76d439ef8f38b5dcebdfbaa8ede))
* :art: refactor of admin project types and refs ([be0684f](https://github.com/cloud-pi-native/console/commit/be0684f378696a24304d7abecd6b90c0738e1785))
* :bento: update MultiSelector component ([9a44bb3](https://github.com/cloud-pi-native/console/commit/9a44bb35d8aa0da1aaf8f96a745c28f97f6ea53c))
* :bug: add conditional chaining to avoid error in dsobadge ([56ad040](https://github.com/cloud-pi-native/console/commit/56ad0403242222f50ef8abe898b46c241d40b66d))
* :bug: add missing await in gitlab createProjectMirror ([f1bf907](https://github.com/cloud-pi-native/console/commit/f1bf9072b88abec3f08654720f64571aa421db34))
* :bug: change appproject policy ([e20b6c4](https://github.com/cloud-pi-native/console/commit/e20b6c431348b08bed7ea215a967c51d0e6187f0))
* :bug: clusters related bugs ([c2ba63e](https://github.com/cloud-pi-native/console/commit/c2ba63e94d87bdf1741e9a51e4522c3f77b354de))
* :bug: create appropriate folders for server image ([3027fef](https://github.com/cloud-pi-native/console/commit/3027fef08ebc8a58e2e705645febaf40af7314f5))
* :bug: filter archived project from cluster form ([50913f5](https://github.com/cloud-pi-native/console/commit/50913f57def7d8e3e36f63a5876e476e64884828))
* :bug: fix endless redirect on login if authenticated ([461c6bd](https://github.com/cloud-pi-native/console/commit/461c6bd385f44a551fe9af1027c6beca1e7fa9ec))
* :bug: fix gitlab group deletion ([12a35d0](https://github.com/cloud-pi-native/console/commit/12a35d08619fbeb231d4e7931fb7fdb51ef63fde))
* :bug: fix missing extensions ([4cd4b21](https://github.com/cloud-pi-native/console/commit/4cd4b212e88d30b447d5674cf157ce71862fe14a))
* :bug: fix not updated argocd cluster and not using insecure in config ([69e7a9a](https://github.com/cloud-pi-native/console/commit/69e7a9ac7a584d76ce047b8330356ce2387218d7))
* :bug: fix types, add void and handle it ([110cfed](https://github.com/cloud-pi-native/console/commit/110cfedfcb2a58757b5ad47f96f6323cbe034550))
* :bug: import new shared package ([ff0b0db](https://github.com/cloud-pi-native/console/commit/ff0b0db9dcc96c10b409b51bd4180c03b5b01478))
* :bug: launch e2e test in open mode without turbo ([d3497d1](https://github.com/cloud-pi-native/console/commit/d3497d13e3862d7701cbbd2da65cb7a571032eb2))
* :bug: manage cancel emit on update repo form ([16df7b4](https://github.com/cloud-pi-native/console/commit/16df7b43d584fb1edfa5a01938356b04b785429b))
* :bug: missed limits ([f2ba02d](https://github.com/cloud-pi-native/console/commit/f2ba02d41e923b0add154fc7cb5ae7d8a2c89370))
* :bug: missing check in search group ([7fb65c1](https://github.com/cloud-pi-native/console/commit/7fb65c12754eea955c7ba942329cf5bfa612f8b7))
* :bug: missing check nexus find user ([993dd2a](https://github.com/cloud-pi-native/console/commit/993dd2ab30687d0ea23000596f909b77b3be70e5))
* :bug: missing check nexus find user ([e0f1674](https://github.com/cloud-pi-native/console/commit/e0f167424df8e0c01619a0da38bf3e5723014ee1))
* :bug: now the admin can chosse skip tls api kube ([e09aa2a](https://github.com/cloud-pi-native/console/commit/e09aa2ac659e1439f59050c56256f530b9f8cae6))
* :bug: optional paramater to call repeatFn ([a7925dc](https://github.com/cloud-pi-native/console/commit/a7925dcfbaaf1b1727e8cdede06bf9c24d89cad8))
* :bug: pin pnpm version in dockerfiles ([b494a2f](https://github.com/cloud-pi-native/console/commit/b494a2f0d190e3da81f9765dded76187333e61af))
* :bug: pnpm lock ([a7925dc](https://github.com/cloud-pi-native/console/commit/a7925dcfbaaf1b1727e8cdede06bf9c24d89cad8))
* :bug: retrieve kc user bug fix ([aaf61c5](https://github.com/cloud-pi-native/console/commit/aaf61c51a288cd7998a5d3883cf467471b42c3cb))
* :bug: run.sh js to ts reference ([a7925dc](https://github.com/cloud-pi-native/console/commit/a7925dcfbaaf1b1727e8cdede06bf9c24d89cad8))
* :bug: send cluster kubeconfig in hook paylaod ([e21c692](https://github.com/cloud-pi-native/console/commit/e21c6923d016bb59a69be457d5d4efc08243a771))
* :bug: share loadingct display knowledge ([8520a5c](https://github.com/cloud-pi-native/console/commit/8520a5c827d05316e9dedc59dd90a92fb3f513d4))
* :bug: should not set caData if skipTLSVerify is true ([ccd66f8](https://github.com/cloud-pi-native/console/commit/ccd66f83be75850ffe47e87ff405fcf9cf136e3c))
* :bug: update compile cmd to build in plugins pkgs ([b9e4424](https://github.com/cloud-pi-native/console/commit/b9e44246c22238c3cdb383515816951ace4f65c2))
* :bug: use argoCD regex for internalRepoName ([6c2ed3f](https://github.com/cloud-pi-native/console/commit/6c2ed3f682514b947e66547ce136d148b9e2d686))
* :bug: various fixes around plugins and controllers ([6271c67](https://github.com/cloud-pi-native/console/commit/6271c67f3d8471ee6afc3409c5d753f7ade950f0))
* :card_file_box: set all project status to failed for v6 release ([b689c35](https://github.com/cloud-pi-native/console/commit/b689c356f27e769b18aabab2f2510dd24354d95f))
* :construction: fix configs ([ff77d7a](https://github.com/cloud-pi-native/console/commit/ff77d7ab10aecdf92643f9bcece9ef3360bc4c46))
* :goal_net: add try catch in checkApi func ([baf38af](https://github.com/cloud-pi-native/console/commit/baf38af3f96fe227a934228d7875181e1407c8e9))
* :goal_net: allow deleting environment if not found ([a2dc7da](https://github.com/cloud-pi-native/console/commit/a2dc7daf96942121e9291063569ff9c6612bd345))
* :goal_net: throw error if catched in business ([1790ec2](https://github.com/cloud-pi-native/console/commit/1790ec274e965d5d62a0693937eec5ee765602e2))
* :goal_net: validate schema before creating repo or env ([23535c3](https://github.com/cloud-pi-native/console/commit/23535c3e0c9923df0cc8adb5fb646dc2dd21fb7c))
* :heavy_plus_sign: fix pnpm-lock file ([93aa64e](https://github.com/cloud-pi-native/console/commit/93aa64e146e11f30c8305f85d7ff03b696b0297b))
* :label: add missing fastify keycloak adapter patch to improve types ([2d4ca1f](https://github.com/cloud-pi-native/console/commit/2d4ca1fc64c374cd06cef5b27842502db59a0c1c))
* :lipstick: add icons ([ed1887b](https://github.com/cloud-pi-native/console/commit/ed1887baf6a65d0d58c6e399991a1419351c3883))
* :lipstick: fix padding ([907d424](https://github.com/cloud-pi-native/console/commit/907d424a94f2dfc7e7110882438130bdb5dc4cd8))
* :lipstick: restyle logs interface ([fc362cf](https://github.com/cloud-pi-native/console/commit/fc362cf461c65f6e4e8e7b6b2d92c83a41844bdf))
* :lock: root token is not used in new repo credential when synced ([c92ea8b](https://github.com/cloud-pi-native/console/commit/c92ea8b5ef95097b07c2bbda435ce433f5bba53d))
* :pushpin: pin axios version to avoid vite error ([88c6d30](https://github.com/cloud-pi-native/console/commit/88c6d30b5ab14cd9ca899fdf7cfcd17faa067903))
* :rewind: fix bugs introduced during my vacations ([9ee467c](https://github.com/cloud-pi-native/console/commit/9ee467c69b590a4630dae19f42f2fc5c9321953e))
* :safety_vest: validate user schema before trying to insert it in db ([ab8e6ef](https://github.com/cloud-pi-native/console/commit/ab8e6efdb00ec29c6a9a1e0f89c58ffbc999c966))
* :technologist: change domains for dev and int ([0de00ab](https://github.com/cloud-pi-native/console/commit/0de00abf78543bc769f80be2f0e59795cfefefa5))
* :technologist: fix docker volumes for integ mode ([80af072](https://github.com/cloud-pi-native/console/commit/80af072bfc0affa8ab0b415a3f6d63d17ceaf2c2))
* :technologist: fix import kubeconfig in integration ([51af3dd](https://github.com/cloud-pi-native/console/commit/51af3dd16128a6d4a1e676921937005e295acfc9))
* :test_tube: trying to fix ct test ([c67366e](https://github.com/cloud-pi-native/console/commit/c67366e0b319de7edd681b9ba9265091be5c9e32))
* :test_tube: trying to optimize dependancies for failing modules ([ec97602](https://github.com/cloud-pi-native/console/commit/ec9760236a380efdcabc5bc0f0cb7e9b23c07adb))
* :wrench: handle no values for disabledPlugins ([d0d46a3](https://github.com/cloud-pi-native/console/commit/d0d46a38570db6f626f5879da180829216826fa8))


### Performance Improvements

* :construction: skip failing test for merge ([a7925dc](https://github.com/cloud-pi-native/console/commit/a7925dcfbaaf1b1727e8cdede06bf9c24d89cad8))


### Reverts

* :card_file_box: add missing default for projectStatus ([2263988](https://github.com/cloud-pi-native/console/commit/22639888442da48b097f936d0afb62652d262b02))
* :card_file_box: add missing default for projectStatus ([5653165](https://github.com/cloud-pi-native/console/commit/565316504a1baa90d2c7c999c0ba6810151324f5))
* :poop: comment harbor projet member role update ([63926ae](https://github.com/cloud-pi-native/console/commit/63926ae9c5a5fe6b9e6e8a2d0007f55d186b0f36))


### Build System

* :art: split plugins ([f4ac305](https://github.com/cloud-pi-native/console/commit/f4ac30587917b78d6d0f3e58cdda1b8a08123b48))

## [6.5.2](https://github.com/cloud-pi-native/console/compare/v6.5.1...v6.5.2) (2024-03-13)


### Bug Fixes

* :bug: missing check in search group ([7fb65c1](https://github.com/cloud-pi-native/console/commit/7fb65c12754eea955c7ba942329cf5bfa612f8b7))
* :bug: missing check nexus find user ([e0f1674](https://github.com/cloud-pi-native/console/commit/e0f167424df8e0c01619a0da38bf3e5723014ee1))

## [6.5.1](https://github.com/cloud-pi-native/console/compare/v6.5.0...v6.5.1) (2024-01-25)


### Bug Fixes

* :bug: share loadingct display knowledge ([8520a5c](https://github.com/cloud-pi-native/console/commit/8520a5c827d05316e9dedc59dd90a92fb3f513d4))

## [6.5.0](https://github.com/cloud-pi-native/console/compare/v6.4.0...v6.5.0) (2024-01-25)


### Features

* :children_crossing: better ux for forms in tiles ([da68243](https://github.com/cloud-pi-native/console/commit/da68243a91865732db46b9ae610a82eeec5c9bf2))
* :loud_sound: add payload and full hook response in validation hooks ([adabb02](https://github.com/cloud-pi-native/console/commit/adabb02fd0b8028b1fcdf1113744234a925d72ce))
* :loud_sound: add reqId in db logs ([2b7f22b](https://github.com/cloud-pi-native/console/commit/2b7f22b7e24748dc37c8623bbda3e914ed7cae00))
* :sparkles: add project environments to hook payload ([7aa8117](https://github.com/cloud-pi-native/console/commit/7aa81179ac95afdddf711e1a0a4b3c3a45a35c5a))
* :sparkles: disallow hyphen on project, environment and stage ([f9b05ee](https://github.com/cloud-pi-native/console/commit/f9b05eefee41f7d514d749a0ac3fa1c1d063f051))
* :sparkles: download projects data button for admins ([cb38e75](https://github.com/cloud-pi-native/console/commit/cb38e7573314ba0980c4161d1a77a9e83fddb236))
* :sparkles: to fn, more infos, multi tiles ([8c4de83](https://github.com/cloud-pi-native/console/commit/8c4de83cf3b4bc0e335292d437ddf7d22305ff93))


### Bug Fixes

* :goal_net: validate schema before creating repo or env ([23535c3](https://github.com/cloud-pi-native/console/commit/23535c3e0c9923df0cc8adb5fb646dc2dd21fb7c))
* :pushpin: pin axios version to avoid vite error ([88c6d30](https://github.com/cloud-pi-native/console/commit/88c6d30b5ab14cd9ca899fdf7cfcd17faa067903))

## [6.4.0](https://github.com/cloud-pi-native/console/compare/v6.3.1...v6.4.0) (2023-12-20)


### Features

* :children_crossing: add filtering on admin projects view ([dc5412c](https://github.com/cloud-pi-native/console/commit/dc5412c1a80ce84cd563376a0b7f72da7926a858))
* :sparkles: display cluster infos to users on environment form ([4afdf34](https://github.com/cloud-pi-native/console/commit/4afdf34fc40df7789a00fe6d159ee73370b94cb9))
* :speech_balloon: translate stage in front for better understanding ([5a66479](https://github.com/cloud-pi-native/console/commit/5a6647980319524098a72fcbd2be6affbda3f3d0))


### Bug Fixes

* :art: refactor of admin project types and refs ([be0684f](https://github.com/cloud-pi-native/console/commit/be0684f378696a24304d7abecd6b90c0738e1785))

## [6.3.1](https://github.com/cloud-pi-native/console/compare/v6.3.0...v6.3.1) (2023-12-12)


### Bug Fixes

* :bug: missed limits ([f2ba02d](https://github.com/cloud-pi-native/console/commit/f2ba02d41e923b0add154fc7cb5ae7d8a2c89370))

## [6.3.0](https://github.com/cloud-pi-native/console/compare/v6.2.0...v6.3.0) (2023-12-11)


### Features

* :sparkles: add backoffice for admins ([fadfdfc](https://github.com/cloud-pi-native/console/commit/fadfdfc43c427261adc3e31dbb1907d6dcefc5cb))


### Bug Fixes

* :bug: fix gitlab group deletion ([12a35d0](https://github.com/cloud-pi-native/console/commit/12a35d08619fbeb231d4e7931fb7fdb51ef63fde))

## [6.2.0](https://github.com/cloud-pi-native/console/compare/v6.1.0...v6.2.0) (2023-11-20)


### Features

* :sparkles: delete cluster if no environment suscribed ([8edc50a](https://github.com/cloud-pi-native/console/commit/8edc50a85f266f1135b340d6df39a48ea7ac746b))


### Bug Fixes

* :alien: add owner in archiveProject hookpayload ([5c99183](https://github.com/cloud-pi-native/console/commit/5c99183f03afe0c20980c9649ce37788b833a351))
* :bug: use argoCD regex for internalRepoName ([6c2ed3f](https://github.com/cloud-pi-native/console/commit/6c2ed3f682514b947e66547ce136d148b9e2d686))

## [6.1.0](https://github.com/cloud-pi-native/console/compare/v6.0.0...v6.1.0) (2023-11-13)


### Features

* :sparkles: add quota and stage management for admin ([80ce642](https://github.com/cloud-pi-native/console/commit/80ce642b69a5eaaf1b53c7d884b70889c4e71d9d))
* :sparkles: add stage management for admin ([e133853](https://github.com/cloud-pi-native/console/commit/e13385347610014a4edcc0b2ff12252386328cb8))


### Bug Fixes

* :bug: add missing await in gitlab createProjectMirror ([f1bf907](https://github.com/cloud-pi-native/console/commit/f1bf9072b88abec3f08654720f64571aa421db34))
* :bug: fix endless redirect on login if authenticated ([461c6bd](https://github.com/cloud-pi-native/console/commit/461c6bd385f44a551fe9af1027c6beca1e7fa9ec))
* :bug: should not set caData if skipTLSVerify is true ([ccd66f8](https://github.com/cloud-pi-native/console/commit/ccd66f83be75850ffe47e87ff405fcf9cf136e3c))
* :lock: root token is not used in new repo credential when synced ([c92ea8b](https://github.com/cloud-pi-native/console/commit/c92ea8b5ef95097b07c2bbda435ce433f5bba53d))

## [6.0.0](https://github.com/cloud-pi-native/console/compare/v5.11.0...v6.0.0) (2023-10-27)


### ⚠ BREAKING CHANGES

* :boom: environment management

### Features

* :boom: environment management ([b4f3793](https://github.com/cloud-pi-native/console/commit/b4f379315803aee1264192c16851af049fa661ee))
* :sparkles: services secrets improvement ([40e3ddd](https://github.com/cloud-pi-native/console/commit/40e3ddd2acd7e000b03f5bfa5663533449d315bf))


### Bug Fixes

* :alien: change logo for svg ([aa8315b](https://github.com/cloud-pi-native/console/commit/aa8315b63617c8413a448499e2ab0e68c216faef))
* :bug: add conditional chaining to avoid error in dsobadge ([56ad040](https://github.com/cloud-pi-native/console/commit/56ad0403242222f50ef8abe898b46c241d40b66d))
* :bug: launch e2e test in open mode without turbo ([d3497d1](https://github.com/cloud-pi-native/console/commit/d3497d13e3862d7701cbbd2da65cb7a571032eb2))
* :card_file_box: set all project status to failed for v6 release ([b689c35](https://github.com/cloud-pi-native/console/commit/b689c356f27e769b18aabab2f2510dd24354d95f))

## [5.11.0](https://github.com/cloud-pi-native/console/compare/v5.10.1...v5.11.0) (2023-10-13)


### Features

* :children_crossing: add default branch to sync in mirror pipeline ([45dbc01](https://github.com/cloud-pi-native/console/commit/45dbc01c4a95d04a201b2c5e198e3b192e1e5fe2))


### Bug Fixes

* :goal_net: add try catch in checkApi func ([baf38af](https://github.com/cloud-pi-native/console/commit/baf38af3f96fe227a934228d7875181e1407c8e9))

## [5.10.1](https://github.com/cloud-pi-native/console/compare/v5.10.0...v5.10.1) (2023-10-10)

### Bug Fixes

* :ambulance: send internalRepoName to plugins on updateRepository hook ([2bde004](https://github.com/cloud-pi-native/console/commit/2bde0045592f2898975633c0c6f959311234f7f3))

## [5.10.0](https://github.com/cloud-pi-native/console/compare/v5.9.1...v5.10.0) (2023-10-03)

### Features

* :iphone: more responsive sideMenu and permissionForm ([c840306](https://github.com/cloud-pi-native/console/commit/c8403067224b5ad90e34b8233a1830ceeec8b715))
* :sparkles: enable admin cluster update ([f81008e](https://github.com/cloud-pi-native/console/commit/f81008e97c25bc73466b6257bd4cb2dc0bde9163))

## [5.9.1](https://github.com/cloud-pi-native/console/compare/v5.9.0...v5.9.1) (2023-09-28)

### Bug Fixes

* :bug: fix not updated argocd cluster and not using insecure in config ([69e7a9a](https://github.com/cloud-pi-native/console/commit/69e7a9ac7a584d76ce047b8330356ce2387218d7))

## [5.9.0](https://github.com/cloud-pi-native/console/compare/v5.8.2...v5.9.0) (2023-09-25)

### Features

* :technologist: add swagger for server api ([abe15d2](https://github.com/cloud-pi-native/console/commit/abe15d2ceb93039ecd795389156f8730e5327841))

### Bug Fixes

* :ambulance: register cluster destination via kubeconfig ([0e8d310](https://github.com/cloud-pi-native/console/commit/0e8d3102267268c595d172808e30183dbe4b3aad))
* :safety_vest: validate user schema before trying to insert it in db ([ab8e6ef](https://github.com/cloud-pi-native/console/commit/ab8e6efdb00ec29c6a9a1e0f89c58ffbc999c966))

## [5.8.2](https://github.com/cloud-pi-native/console/compare/v5.8.1...v5.8.2) (2023-09-20)

### Bug Fixes

* :wrench: handle no values for disabledPlugins ([d0d46a3](https://github.com/cloud-pi-native/console/commit/d0d46a38570db6f626f5879da180829216826fa8))

## [5.8.1](https://github.com/cloud-pi-native/console/compare/v5.8.0...v5.8.1) (2023-09-18)

### Bug Fixes

* :ambulance: bad logic register plugins ([049040e](https://github.com/cloud-pi-native/console/commit/049040eafda26214afbc2118cb56542b133feca5))

## [5.8.0](https://github.com/cloud-pi-native/console/compare/v5.7.0...v5.8.0) (2023-09-18)

### Features

* :passport_control: update harbor project member role ([4419dd5](https://github.com/cloud-pi-native/console/commit/4419dd5f395f79a9eb99e8c0f305a7433ad84f7e))
* :sparkles: add infos key for cluster ([25ab8b8](https://github.com/cloud-pi-native/console/commit/25ab8b8d821c37f4491bd8fea075bdc7fbfcfc93))
* :sparkles: add tlsServerName input in cluster form ([4bdc01e](https://github.com/cloud-pi-native/console/commit/4bdc01ef9dd5b2041a34491e46b9759e5c6652f0))
* :technologist: add images auto-scan to harbor settings ([507c6e6](https://github.com/cloud-pi-native/console/commit/507c6e6a541b19502084276db30cf834e586d955))

### Bug Fixes

* :alien: fetch does not support proxy natively ([20d531d](https://github.com/cloud-pi-native/console/commit/20d531d622e6fe9e2869e13db0d205b44ad602ce))
* :art: can disble plugins by name, and some fixes ([f2bd397](https://github.com/cloud-pi-native/console/commit/f2bd397e0526d76d439ef8f38b5dcebdfbaa8ede))
* :bug: clusters related bugs ([c2ba63e](https://github.com/cloud-pi-native/console/commit/c2ba63e94d87bdf1741e9a51e4522c3f77b354de))
* :bug: now the admin can chosse skip tls api kube ([e09aa2a](https://github.com/cloud-pi-native/console/commit/e09aa2ac659e1439f59050c56256f530b9f8cae6))
* :goal_net: throw error if catched in business ([1790ec2](https://github.com/cloud-pi-native/console/commit/1790ec274e965d5d62a0693937eec5ee765602e2))
* :heavy_plus_sign: fix pnpm-lock file ([93aa64e](https://github.com/cloud-pi-native/console/commit/93aa64e146e11f30c8305f85d7ff03b696b0297b))

### Reverts

* :poop: comment harbor projet member role update ([63926ae](https://github.com/cloud-pi-native/console/commit/63926ae9c5a5fe6b9e6e8a2d0007f55d186b0f36))

## [5.7.0](https://github.com/cloud-pi-native/console/compare/v5.6.0...v5.7.0) (2023-09-07)

### Features

* :closed_lock_with_key: retrieve project secrets from vault and display it in front ([201435d](https://github.com/cloud-pi-native/console/commit/201435d18047400ec9fe4252b6be2c11dbd57068))
* :closed_lock_with_key: retrieve project secrets from vault and display it in front ([201435d](https://github.com/cloud-pi-native/console/commit/201435d18047400ec9fe4252b6be2c11dbd57068))
* :safety_vest: update password character support ([c82f35f](https://github.com/cloud-pi-native/console/commit/c82f35fb7f20ad06c0a63eb518407d17ddb88b51))
* :sparkles: handle gitlab membership ([7ff68bd](https://github.com/cloud-pi-native/console/commit/7ff68bdf8f9a16562cfc00fbdb0c322b0f09943d))

### Bug Fixes

* :bug: change appproject policy ([e20b6c4](https://github.com/cloud-pi-native/console/commit/e20b6c431348b08bed7ea215a967c51d0e6187f0))
* :bug: import new shared package ([ff0b0db](https://github.com/cloud-pi-native/console/commit/ff0b0db9dcc96c10b409b51bd4180c03b5b01478))

### Reverts

* :card_file_box: add missing default for projectStatus ([2263988](https://github.com/cloud-pi-native/console/commit/22639888442da48b097f936d0afb62652d262b02))
* :card_file_box: add missing default for projectStatus ([5653165](https://github.com/cloud-pi-native/console/commit/565316504a1baa90d2c7c999c0ba6810151324f5))

## [5.6.0](https://github.com/cloud-pi-native/console/compare/v5.5.0...v5.6.0) (2023-08-28)

### Features

* :sparkles: better integration of sonarqube ([c0a0517](https://github.com/cloud-pi-native/console/commit/c0a05173a158b74d752aafaccdff58fc3b29c382))

### Bug Fixes

* :ambulance: preserve status colum in project ([febfaff](https://github.com/cloud-pi-native/console/commit/febfaff702d6a55210723ce213d603ad059ceaed))
* :bug: optional paramater to call repeatFn ([a7925dc](https://github.com/cloud-pi-native/console/commit/a7925dcfbaaf1b1727e8cdede06bf9c24d89cad8))
* :bug: pnpm lock ([a7925dc](https://github.com/cloud-pi-native/console/commit/a7925dcfbaaf1b1727e8cdede06bf9c24d89cad8))
* :bug: run.sh js to ts reference ([a7925dc](https://github.com/cloud-pi-native/console/commit/a7925dcfbaaf1b1727e8cdede06bf9c24d89cad8))
* :lipstick: fix padding ([907d424](https://github.com/cloud-pi-native/console/commit/907d424a94f2dfc7e7110882438130bdb5dc4cd8))
* :lipstick: restyle logs interface ([fc362cf](https://github.com/cloud-pi-native/console/commit/fc362cf461c65f6e4e8e7b6b2d92c83a41844bdf))

### Performance Improvements

* :construction: skip failing test for merge ([a7925dc](https://github.com/cloud-pi-native/console/commit/a7925dcfbaaf1b1727e8cdede06bf9c24d89cad8))

## [5.5.0](https://github.com/cloud-pi-native/console/compare/v5.4.0...v5.5.0) (2023-08-22)

### Features

* :children_crossing: inform users that clipboard works only with https ([909c3b6](https://github.com/cloud-pi-native/console/commit/909c3b672bcae1401d2133c8fff94cdca91f61bc))
* :sparkles: retrieve user from kc if does not exist in db ([3d4461a](https://github.com/cloud-pi-native/console/commit/3d4461ae7d82e6f64a1644921893d89f41e9a2d9))

### Bug Fixes

* :alien: sync controllers require bigger axios timeout ([5116bbd](https://github.com/cloud-pi-native/console/commit/5116bbdb8f49b73c920ac04421ca05ccabef902c))
* :bento: update MultiSelector component ([9a44bb3](https://github.com/cloud-pi-native/console/commit/9a44bb35d8aa0da1aaf8f96a745c28f97f6ea53c))
* :bug: filter archived project from cluster form ([50913f5](https://github.com/cloud-pi-native/console/commit/50913f57def7d8e3e36f63a5876e476e64884828))
* :bug: fix types, add void and handle it ([110cfed](https://github.com/cloud-pi-native/console/commit/110cfedfcb2a58757b5ad47f96f6323cbe034550))
* :bug: manage cancel emit on update repo form ([16df7b4](https://github.com/cloud-pi-native/console/commit/16df7b43d584fb1edfa5a01938356b04b785429b))
* :bug: retrieve kc user bug fix ([aaf61c5](https://github.com/cloud-pi-native/console/commit/aaf61c51a288cd7998a5d3883cf467471b42c3cb))
* :bug: various fixes around plugins and controllers ([6271c67](https://github.com/cloud-pi-native/console/commit/6271c67f3d8471ee6afc3409c5d753f7ade950f0))
* :goal_net: allow deleting environment if not found ([a2dc7da](https://github.com/cloud-pi-native/console/commit/a2dc7daf96942121e9291063569ff9c6612bd345))
* :lipstick: add icons ([ed1887b](https://github.com/cloud-pi-native/console/commit/ed1887baf6a65d0d58c6e399991a1419351c3883))
* :rewind: fix bugs introduced during my vacations ([9ee467c](https://github.com/cloud-pi-native/console/commit/9ee467c69b590a4630dae19f42f2fc5c9321953e))
* :technologist: fix import kubeconfig in integration ([51af3dd](https://github.com/cloud-pi-native/console/commit/51af3dd16128a6d4a1e676921937005e295acfc9))

## [5.4.0](https://github.com/cloud-pi-native/console/compare/v5.3.0...v5.4.0) (2023-08-02)

### Features

* :children_crossing: improve home page and update doc link ([038d982](https://github.com/cloud-pi-native/console/commit/038d982ead7bbfa70debdf902d5c46e8518c1e60))
* :sparkles: add or remove a team member via keycloak ([0563d20](https://github.com/cloud-pi-native/console/commit/0563d20ca93a25decc7dbb5d945e2b738b0d575a))

### Bug Fixes

* :technologist: change domains for dev and int ([0de00ab](https://github.com/cloud-pi-native/console/commit/0de00abf78543bc769f80be2f0e59795cfefefa5))

## [5.3.0](https://github.com/cloud-pi-native/console/compare/v5.2.1...v5.3.0) (2023-08-01)

### Features

* :alien: synch controllers with plugin calls ([d0a271d](https://github.com/cloud-pi-native/console/commit/d0a271d188840d8682b6abe412ee8da4db7992b1))
* :children_crossing: add confirm box for updating an organization ([5c3cd20](https://github.com/cloud-pi-native/console/commit/5c3cd207221a22ed5d93bdf8638b23c9849897f6))
* :sparkles: lock and unlock projects according to their org status ([3b9444a](https://github.com/cloud-pi-native/console/commit/3b9444aeaa2fab76461946e9a4d00e8afe4a62f1))

### Bug Fixes

* :bug: create appropriate folders for server image ([3027fef](https://github.com/cloud-pi-native/console/commit/3027fef08ebc8a58e2e705645febaf40af7314f5))
* :bug: fix missing extensions ([4cd4b21](https://github.com/cloud-pi-native/console/commit/4cd4b212e88d30b447d5674cf157ce71862fe14a))
* :bug: pin pnpm version in dockerfiles ([b494a2f](https://github.com/cloud-pi-native/console/commit/b494a2f0d190e3da81f9765dded76187333e61af))

## [5.2.1](https://github.com/cloud-pi-native/console/compare/v5.2.0...v5.2.1) (2023-07-21)

### Bug Fixes

* :adhesive_bandage: update kaniko stage name in gitlab ci ([7a71712](https://github.com/cloud-pi-native/console/commit/7a71712075d7aed5aeeb00adb1d2ec51b6d717ab))

## [5.2.0](https://github.com/cloud-pi-native/console/compare/v5.1.0...v5.2.0) (2023-07-20)

### Features

* :children_crossing: improve gitlab mirroring by using a single mirror repo ([914bbe4](https://github.com/cloud-pi-native/console/commit/914bbe4546a3e876a6cd8847523f18e95d688d44))
* :sparkles: add id in admin user table ([d1ebcea](https://github.com/cloud-pi-native/console/commit/d1ebcea1768993b6ab31e5f45a6642ac3577cfc5))

### Bug Fixes

* :bug: add missing data to add argo cluster ([fc53f54](https://github.com/cloud-pi-native/console/commit/fc53f54d8f2d211857aa82c43589b9ee26e214b8))
* :bug: delete kube resources when deleting a project ([5e8cd51](https://github.com/cloud-pi-native/console/commit/5e8cd514edc8a0eb4f5d49208cb17b6da82f4fd7))
* :bug: fix argo plugin ([b1dc1fb](https://github.com/cloud-pi-native/console/commit/b1dc1fb60ba89b534c3e3cd357b89a4e08b74838))

## [5.1.0](https://github.com/cloud-pi-native/console/compare/v5.0.0...v5.1.0) (2023-07-18)

### Features

* :alien: add project infos for canel plugin ([a4516a1](https://github.com/cloud-pi-native/console/commit/a4516a14b2439dd3a74540168aee6daa586c7308))
* :alien: add updateProject hook for description update for example ([7e97505](https://github.com/cloud-pi-native/console/commit/7e97505b5a75c3f6c680d5b1bb6f18a9e45b87b3))

### Bug Fixes

* :bug: fix projectLimit for gitlab plugin ([13fca89](https://github.com/cloud-pi-native/console/commit/13fca89f37a16b980dce7f16e87151510d6f0b63))
* :bug: missing await before plugins hook and logs recording on archiveProject ([e221341](https://github.com/cloud-pi-native/console/commit/e221341a7db27d67bfa40e4231d47de1e5e8648f))
* :bug: missing await before plugins hook and logs recording on archiveProject ([2515c62](https://github.com/cloud-pi-native/console/commit/2515c624afd1d89718a98085c5e41c1c996157b8))

## [5.0.0](https://github.com/cloud-pi-native/console/compare/v4.1.0...v5.0.0) (2023-07-13)

### ⚠ BREAKING CHANGES

* :boom: migrate from sequelize to prisma

### Features

* :children_crossing: add organization to differenciate project ([5814d7e](https://github.com/cloud-pi-native/console/commit/5814d7e00b5a6a335a16059b62f7af456d3b4a58))
* :sparkles: allow updating repo ([27b59cf](https://github.com/cloud-pi-native/console/commit/27b59cfc5cacdf0e96b0fd22b090ce4ab038792d))
* :sparkles: always show ci form ([753d64b](https://github.com/cloud-pi-native/console/commit/753d64bc011701dcc9297097b1a0aec87cef6c03))
* :tada: introduce multi-cluster deployment ([0e6c065](https://github.com/cloud-pi-native/console/commit/0e6c065d421c117050e00944ca68114414a05dc7))
* :technologist: add config for codespace ([1ff7996](https://github.com/cloud-pi-native/console/commit/1ff79966454be7961ba80049be65815cfce1d4cf))

### Bug Fixes

* :alien: change gitlab api calls ([f04dc87](https://github.com/cloud-pi-native/console/commit/f04dc87208ca19ee2b06ff2c35535e51a72f84cd))
* :art: finish pr ([2150961](https://github.com/cloud-pi-native/console/commit/2150961433d0b097100ea62cf1fd7be49fbb4571))
* :art: quote fixes ([2150961](https://github.com/cloud-pi-native/console/commit/2150961433d0b097100ea62cf1fd7be49fbb4571))
* :bug: add module on shared ([2150961](https://github.com/cloud-pi-native/console/commit/2150961433d0b097100ea62cf1fd7be49fbb4571))
* :bug: fix imports, change dependencies ([41f427f](https://github.com/cloud-pi-native/console/commit/41f427fe17daef7ef1b3c330ec5635338edfda59))
* :bug: fix logs pagination bug ([7f3a990](https://github.com/cloud-pi-native/console/commit/7f3a99085f701d02367fab04f194dc0c0e85356d))
* :bug: forgot await in argo plugin ([f4504d4](https://github.com/cloud-pi-native/console/commit/f4504d4b1ccc999274c3267508c943f23fd8690b))
* :bug: retrieve also inactive orgs on admin project list page ([4b8977e](https://github.com/cloud-pi-native/console/commit/4b8977e01214295f3090ab16a92bde4b7d7a64f9))
* :construction_worker: fix CI: tsconfig is needed ([2150961](https://github.com/cloud-pi-native/console/commit/2150961433d0b097100ea62cf1fd7be49fbb4571))
* :construction: in progress ([2150961](https://github.com/cloud-pi-native/console/commit/2150961433d0b097100ea62cf1fd7be49fbb4571))
* :lipstick: more contrasted icon color for archived project ([790d276](https://github.com/cloud-pi-native/console/commit/790d2761d3f77756144172e3ccd80bcb0df4572d))

### Code Refactoring

* :boom: migrate from sequelize to prisma ([37b065d](https://github.com/cloud-pi-native/console/commit/37b065d6cff844dfd1b9d2276831eddefa64a71e))

## [4.1.0](https://github.com/cloud-pi-native/console/compare/v4.0.0...v4.1.0) (2023-06-12)

### Features

* :sparkles: add admin log page ([41058ee](https://github.com/cloud-pi-native/console/commit/41058ee51899d4ec351ae7adad10eb3fefa99f8b))

### Bug Fixes

* :bug: harbor, fix remove repos from unknown project ([8a18381](https://github.com/cloud-pi-native/console/commit/8a18381c2197634d90649a8520dd068a59e5369c))
* :bug: test if external dir exists ([3276400](https://github.com/cloud-pi-native/console/commit/3276400a00b3435eb87e225e0e8deadd5a311b0d))
* :zap: gitlab, stabilize user search and lifecycle ([179c912](https://github.com/cloud-pi-native/console/commit/179c91269ecf04ff6a489a5d92f490b940446e70))

## [4.0.0](https://github.com/dnum-mi/dso-console/compare/v3.4.1...v4.0.0) (2023-06-08)

### ⚠ BREAKING CHANGES

* :boom: clarify business logic on status and locking

### Features

* :alien: add hook to synchronize organizations ([6ccd985](https://github.com/dnum-mi/dso-console/commit/6ccd9855fc8713043a9f24687cfe07d105540c91))
* :alien: add hook to synchronize organizations ([6ccd985](https://github.com/dnum-mi/dso-console/commit/6ccd9855fc8713043a9f24687cfe07d105540c91))
* :alien: add keys to source organizations ([626c031](https://github.com/dnum-mi/dso-console/commit/626c03135571199c3a1f1e72e19132bc651288a3))
* :boom: if status: failed (aka plugins failed), project remains locked ([8548d6e](https://github.com/dnum-mi/dso-console/commit/8548d6e0d654673789bdebba31237fa98a86788a))
* :children_crossing: improve user experience on dso-console ([720b3c9](https://github.com/dnum-mi/dso-console/commit/720b3c9570238453edeb9ceff11ba21f37c50c41))
* :children_crossing: improve ux for danger zone ([720b3c9](https://github.com/dnum-mi/dso-console/commit/720b3c9570238453edeb9ceff11ba21f37c50c41))
* :children_crossing: improve UX on permission form ([fb72076](https://github.com/dnum-mi/dso-console/commit/fb72076f16f79df456392fc7f9a7129ab1655832))
* :children_crossing: redirect to dashboard when selecting a project ([720b3c9](https://github.com/dnum-mi/dso-console/commit/720b3c9570238453edeb9ceff11ba21f37c50c41))
* :necktie: allow only one plugin to register on hook fetchOrganizations ([6ccd985](https://github.com/dnum-mi/dso-console/commit/6ccd9855fc8713043a9f24687cfe07d105540c91))
* :sparkles: add project admin view ([b49ff96](https://github.com/dnum-mi/dso-console/commit/b49ff967853e31ca6cbcd8cd2ff78b299023788e))

### Bug Fixes

* :art: temp fix labels, add check, refacto get ns ([a43f50c](https://github.com/dnum-mi/dso-console/commit/a43f50cb93b2453f025b9d4284f2b65b6134161a))
* :bug: fix payload, fix check step ([ff76b27](https://github.com/dnum-mi/dso-console/commit/ff76b2750352cbe7b2d49ff5fb6e4d3e424b328f))
* :bug: remove harbor repos before projects ([7239329](https://github.com/dnum-mi/dso-console/commit/72393297dcfaf44938e2814cccfd8366613ba75c))
* :necktie: clarify business logic on status and locking ([8548d6e](https://github.com/dnum-mi/dso-console/commit/8548d6e0d654673789bdebba31237fa98a86788a))

### Code Refactoring

* :boom: clarify business logic on status and locking ([8548d6e](https://github.com/dnum-mi/dso-console/commit/8548d6e0d654673789bdebba31237fa98a86788a))

## [3.4.1](https://github.com/dnum-mi/dso-console/compare/v3.4.0...v3.4.1) (2023-05-22)

### Bug Fixes

* :art: change ns labels ([ae14d67](https://github.com/dnum-mi/dso-console/commit/ae14d6736a3b3276b3406562709cf77e3aab0668))
* :construction: hooks payload send full owner object, bug getSingleOwnerByProjectId ([0e74895](https://github.com/dnum-mi/dso-console/commit/0e74895695b42d4e13a645ef4005afbffec59b64))

## [3.4.0](https://github.com/dnum-mi/dso-console/compare/v3.3.1...v3.4.0) (2023-05-15)

### Features

* :alien: owner name is required to create Canel user ([e4aa5e9](https://github.com/dnum-mi/dso-console/commit/e4aa5e9662fb0494ef43b7f52140c9c11702613f))

## [3.3.1](https://github.com/dnum-mi/dso-console/compare/v3.3.0...v3.3.1) (2023-05-11)

### Bug Fixes

* :ambulance: keycloak now sends group path ([913f402](https://github.com/dnum-mi/dso-console/commit/913f40295f7f0eab17964e72e38e61200523456e))

## [3.3.0](https://github.com/dnum-mi/dso-console/compare/v3.2.3...v3.3.0) (2023-05-11)

### Features

* :sparkles: add organization page for admins ([5e6b7fa](https://github.com/dnum-mi/dso-console/commit/5e6b7fa252285b432ef5869aedf8881b642eff53))

### Bug Fixes

* :ambulance: handle unocss migration for media queries ([8fdf445](https://github.com/dnum-mi/dso-console/commit/8fdf4455a34a274c3723685928549bb30bb04762))
* :sparkles: set ingress secretName ([8be3479](https://github.com/dnum-mi/dso-console/commit/8be34796b15219a6b4f77585662b21d8d04c76c8))

## [3.2.3](https://github.com/dnum-mi/dso-console/compare/v3.2.2...v3.2.3) (2023-05-09)

### Bug Fixes

* :ambulance: keycloak group id, typo ([1aedf77](https://github.com/dnum-mi/dso-console/commit/1aedf77b4a74698bb1d52cbfe6863bd249a7eadb))

## [3.2.2](https://github.com/dnum-mi/dso-console/compare/v3.2.1...v3.2.2) (2023-05-09)

### Bug Fixes

* :ambulance: missing ownerid at env init ([14696ff](https://github.com/dnum-mi/dso-console/commit/14696ffc24a2bfe5345b135e99f48502ba0d2fae))

## [3.2.1](https://github.com/dnum-mi/dso-console/compare/v3.2.0...v3.2.1) (2023-05-09)

### Bug Fixes

* :ambulance: habor missing slash on oidc group ([e85b903](https://github.com/dnum-mi/dso-console/commit/e85b9031f77c7feba05f04b9444c5d6862342246))
* :ambulance: keycloak do not add owner in group env ([f20b3da](https://github.com/dnum-mi/dso-console/commit/f20b3da4a8666d3b2912c3b7147819818a96c8ed))

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
* :lipstick: add dark theme ([cfc16d8](https://github.com/dnum-mi/dso-console/commit/cfc16d81391c28447d02297a9ebdf22c1f142c6f))
* :lipstick: add dark theme ([cfc16d8](https://github.com/dnum-mi/dso-console/commit/cfc16d81391c28447d02297a9ebdf22c1f142c6f))
* :loud_sound: add a short description for database logging ([4146f5a](https://github.com/dnum-mi/dso-console/commit/4146f5ae7048fa280a654b5471a32968af159b2f))
* :technologist: do not drop database in integration dev ([521d503](https://github.com/dnum-mi/dso-console/commit/521d503cdf5e2c24f9e148bc6435db485e1252e7))

### Bug Fixes

* :ambulance: add kaniko proxy ([1564b6f](https://github.com/dnum-mi/dso-console/commit/1564b6f7a696c13846799b38557b1003d2cb87c8))
* :ambulance: stabilize gitlab search and vault secret name ([044da15](https://github.com/dnum-mi/dso-console/commit/044da1511ff8a5f16136807c70194d662c08db26))
* :bug: display hyphen only if service message exists ([ba5ed65](https://github.com/dnum-mi/dso-console/commit/ba5ed659954235f8b00e78df24029f1186d23b7a))
* :bug: fix controllers logic ([251fba4](https://github.com/dnum-mi/dso-console/commit/251fba44ebd93e645487da63710add4d9382521d))
* :bug: use proxy on services healthcheck ([85eef14](https://github.com/dnum-mi/dso-console/commit/85eef144f8c87760c61203de7944229af2828047))
* :lipstick: make snackbar bakground -color adaptive to theme variations ([851a004](https://github.com/dnum-mi/dso-console/commit/851a004837eb901d02bbf65e20697e457ecde6e2))
* :wrench: rename kubeconfig var ([61fdfbf](https://github.com/dnum-mi/dso-console/commit/61fdfbf3bb47b51225d2cf3c00b167c46ff1bedf))

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
