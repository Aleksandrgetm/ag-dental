# Service catalog SEO preservation comparison

2026-10-12. Read-only current production-connected public CMS payloads; no production metadata writes.

Before: existing approved route/CMS resolution without a catalog. After: identical published source plus the proposed catalog projection, using the corrected shared resolver. Full rendered head equality includes title, description, canonical, all four hreflang links and Open Graph title/description/URL.

| Service path | Locale | Title/description | Complete metadata HTML | Description SHA-256 (same before/after) |
| --- | --- | --- | --- | --- |
| /pakalpojumi/bernu-zobarstnieciba | lv | Identical | Identical | f5e83da025f0a9d78caf086785b5063654b090f18de2494c0af73a9d3189a1d7 |
| /pakalpojumi/bernu-zobarstnieciba | ru | Identical | Identical | ff372b95b1df291d1c005db6f1b4740b243985379b4cf06158028ff292beae25 |
| /pakalpojumi/bernu-zobarstnieciba | en | Identical | Identical | 22cf9e6e48b0ae54782b0760f40c4ee65d54b4fda00de400de2741a8e19f3629 |
| /pakalpojumi/konsultacija | lv | Identical | Identical | df9494833776012405549e3a2322b704fe88cf809c6fac86bcfbaff4598bc2b6 |
| /pakalpojumi/konsultacija | ru | Identical | Identical | d659a01f33b30fbe7e2268e1da221cd545ffa4dfdb0d07ca179699bc55a887c3 |
| /pakalpojumi/konsultacija | en | Identical | Identical | 90dca4befb66dcf74e9e1e79a99f29bf5ff1cf5a525920fbd63b3923dea4e782 |
| /pakalpojumi/saknu-kanalu-arstesana | lv | Identical | Identical | effd7cb61cb66425c62ec4a9b3e059827fe8f7d392e2a01474990042f0bde002 |
| /pakalpojumi/saknu-kanalu-arstesana | ru | Identical | Identical | 2ed1fc11337a0cf6473ed564c83a2b7c136edce4cbbad12e449c79925d4624f5 |
| /pakalpojumi/saknu-kanalu-arstesana | en | Identical | Identical | fdb8581129cd2f28fb5f855a1b2366ef78ebc64eedbc0ed498189549d9272531 |
| /pakalpojumi/zobu-arstesana | lv | Identical | Identical | baced0a90a2c32caa2ba66b9cd2c01c39709a6f45da639f3fda4aa319a37afa6 |
| /pakalpojumi/zobu-arstesana | ru | Identical | Identical | dd928eb7aec94f10a9a144fb220039b8d99064409b02f8f31a297a91e64b8ccb |
| /pakalpojumi/zobu-arstesana | en | Identical | Identical | caf547b11b7ac016ca05091e1c09da8a81e832a7641faf453eabc9fde5fc7ffa |
| /pakalpojumi/zobu-balinasana | lv | Identical | Identical | 7aee97ffaf7d8e721beb3ae2de7870185df1eda25b5ac34ca5859a4bf2768d6e |
| /pakalpojumi/zobu-balinasana | ru | Identical | Identical | ce36d25476e82b7a32cd07e7b2ecf274a3ec9075c3b96e3caed364cadb2a871c |
| /pakalpojumi/zobu-balinasana | en | Identical | Identical | cc31aa213905d5fa89216aad733091464d068167b8759e143ced89ca87d94145 |
| /pakalpojumi/zobu-higiena | lv | Identical | Identical | 02bf2206144996499a2e0766117648196ec90eaabbbc260456b167b8f01f4ea4 |
| /pakalpojumi/zobu-higiena | ru | Identical | Identical | d977e25d785c9b8f46655701c7540711c9ae82d8dea38d7c9962d1121f7cb94d |
| /pakalpojumi/zobu-higiena | en | Identical | Identical | 2794246296f13440df8b8703d67a84a0b0bace33d637c1a43299b264fd4ce845 |
| /pakalpojumi/zobu-kirurgija | lv | Identical | Identical | 1ddb6c8af1f3d4c6a7ac1b7c3553bd39b6eae8478b270c58fb81d1917db715b1 |
| /pakalpojumi/zobu-kirurgija | ru | Identical | Identical | 26b9c7a3a555bf13dec47729fac7cae4252a832de226da374c3da971d73be08d |
| /pakalpojumi/zobu-kirurgija | en | Identical | Identical | 1dc9b624b3de1f68fd2f219bff9669048f0fa9a29de7f244248bf17efb23ce07 |
| /pakalpojumi/zobu-protezesana | lv | Identical | Identical | 88fc0da3ed12e8fd3beccbecb91dcfe670ef0194125d5af17cf75ed50e2592a9 |
| /pakalpojumi/zobu-protezesana | ru | Identical | Identical | 55b9a327a949afaa056c9abb53b40c270dadfd72c971010c1b587d974220e68e |
| /pakalpojumi/zobu-protezesana | en | Identical | Identical | fd022d320f7c9d0b29dc9f3a76171a5fec34c654b4051f0948fb0cb30ecb9020 |

Result: **24/24 preserved**, server and shared client resolver. Existing service slugs and redirect configuration were not edited. New-route optional search metadata is independently editable; it does not overwrite existing `seo.page.*` records.
