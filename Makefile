# Installs the `badag` binary from crates/badag-cli into Cargo's bin
# directory: ~/.cargo/bin by default, or $CARGO_INSTALL_ROOT/bin if set.
CARGO ?= cargo
CRATE := crates/badag-cli
PACKAGE := badag-cli

.PHONY: install-cli uninstall

install-cli:
	$(CARGO) build --release --package $(PACKAGE)
	$(CARGO) install --path $(CRATE) --locked --force

# Leading `-` keeps this idempotent when badag-cli is not installed.
uninstall:
	-$(CARGO) uninstall $(PACKAGE)
