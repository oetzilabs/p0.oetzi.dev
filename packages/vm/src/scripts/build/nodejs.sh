#!/bin/bash
set -euo pipefail
trap 'cleanup' EXIT

OUTPUT_IMAGE="nodejs.ext4"
IMAGE_SIZE="256M"
NODE_VERSION="20.11.1"  # Change this to the version you need

cleanup() {
    [ -d "$TMPDIR" ] && sudo umount -l "$TMPDIR/mnt" 2>/dev/null || true
    rm -rf "$TMPDIR"
    losetup -D 2>/dev/null || true
}

TMPDIR=$(mktemp -d)
cd "$TMPDIR"

# Create an empty ext4 filesystem
dd if=/dev/zero of="$OUTPUT_IMAGE" bs=1M count=256
mkfs.ext4 -q -O ^has_journal,^extent "$OUTPUT_IMAGE"

# Mount it
mkdir -p mnt
sudo mount -o loop "$OUTPUT_IMAGE" mnt

# Download and install Node.js
NODE_ARCH="linux-x64"  # Change to arm64 if needed
NODE_TARBALL="node-v$NODE_VERSION-$NODE_ARCH.tar.xz"

wget -q "https://nodejs.org/dist/v$NODE_VERSION/$NODE_TARBALL"
tar -xf "$NODE_TARBALL"
sudo cp -r node-v$NODE_VERSION-$NODE_ARCH/* mnt/usr/

# Ensure the filesystem has required directories
sudo mkdir -p mnt/{bin,lib,usr/bin,usr/lib}

# Unmount and finalize
sudo umount mnt
mv "$OUTPUT_IMAGE" "$OLDPWD/"

echo "Created Firecracker-compatible filesystem: $OLDPWD/$OUTPUT_IMAGE"
