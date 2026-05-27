## [1.0.2](https://github.com/vlightup-dev/connectXRPL/compare/v1.0.1...v1.0.2) (2026-05-27)


### Bug Fixes

* **crossmark:** remove early multisig co-sign guard to support org account signing ([d1c55f8](https://github.com/vlightup-dev/connectXRPL/commit/d1c55f88799d805971b5223f0d5375296d8abd0b))
* **gemwallet:** call getPublicKey before signTransaction to prevent UI hang ([a8c8edc](https://github.com/vlightup-dev/connectXRPL/commit/a8c8edc2eaab2216aea339c1f0770f935f0217a8))
* **gemwallet:** return txBlob from signTransaction instead of raw signature bytes ([682fff9](https://github.com/vlightup-dev/connectXRPL/commit/682fff9f6697244d7d6b02cc5f53707e6b3c9b50))
* **xaman:** reuse popup across sequential sign requests, omit return_url for multisig ([69ae663](https://github.com/vlightup-dev/connectXRPL/commit/69ae6636690e497bba1fa054be8849246a7be117))

## [1.0.1](https://github.com/vlightup-dev/connectXRPL/compare/v1.0.0...v1.0.1) (2026-05-26)


### Bug Fixes

* **adapters:** add XRPL multisig co-signing support and fix Vite path aliases ([d89a188](https://github.com/vlightup-dev/connectXRPL/commit/d89a1888f6b850b9f4e8547a4435ef99e3ae35ac))

# 1.0.0 (2026-04-10)


### Bug Fixes

* mark darwin-arm64 native binaries as optional for CI compatibility ([9f7f33c](https://github.com/vlightup-dev/connectXRPL/commit/9f7f33cbb2c6286aa9779b907b952fe2b689f79c))
* semantic-release ([65cc68f](https://github.com/vlightup-dev/connectXRPL/commit/65cc68ffc7b242c862af1943efb6f503ca3675f3))
