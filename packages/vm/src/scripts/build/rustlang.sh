#!/bin/bash
set -euo pipefail
trap 'cleanup' EXIT

OUTPUT_IMAGE="rust.ext4"
IMAGE_SIZE="256M"

cleanup() {
    [ -d "$TMPDIR" ] && sudo umount -l "$TMPDIR/mnt" 2>/dev/null || true
    rm -rf "$TMPDIR"
    losetup -D 2>/dev/null || true
}

TMPDIR=$(mktemp -d)
cd "$TMPDIR"

# Create an empty ext4 filesystem
dd if=/dev/zero of="$OUTPUT_IMAGE" bs=1M count=256
mkfs.ext4 -q -O ^has_journal "$OUTPUT_IMAGE"

# Mount it
mkdir -p mnt
sudo mount -o loop "$OUTPUT_IMAGE" mnt

# Download and install Rust
RUST_VERSION="1.77.0"  # Change to desired version
RUST_ARCH="x86_64-unknown-linux-gnu"  # Change to arm64 if needed
RUST_TARBALL="rust-$RUST_VERSION-$RUST_ARCH.tar.xz"

wget -q "https://static.rust-lang.org/dist/$RUST_TARBALL"
tar -xf "$RUST_TARBALL"
sudo cp -r rust-$RUST_VERSION-$RUST_ARCH/* mnt/usr/

# Ensure the filesystem has required directories
sudo mkdir -p mnt/{bin,lib,usr/bin,usr/lib}

# Unmount and finalize
sudo umount mnt
mv "$OUTPUT_IMAGE" "$OLDPWD/"

echo "Created Firecracker-compatible filesystem: $OLDPWD/$OUTPUT_IMAGE"
