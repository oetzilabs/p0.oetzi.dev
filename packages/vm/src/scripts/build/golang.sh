#!/bin/bash
set -euo pipefail
trap 'cleanup' EXIT

OUTPUT_IMAGE="golang.ext4"
IMAGE_SIZE="128M"

cleanup() {
    [ -d "$TMPDIR" ] && sudo umount -l "$TMPDIR/mnt" 2>/dev/null || true
    rm -rf "$TMPDIR"
    losetup -D 2>/dev/null || true
}

TMPDIR=$(mktemp -d)
cd "$TMPDIR"

# Create an empty ext4 filesystem
dd if=/dev/zero of="$OUTPUT_IMAGE" bs=1M count=128
mkfs.ext4 -q -O ^has_journal "$OUTPUT_IMAGE"

# Mount it
mkdir -p mnt
sudo mount -o loop "$OUTPUT_IMAGE" mnt

# Download and install Go
GO_VERSION="1.22.0"  # Change to desired version
GO_ARCH="linux-amd64"  # Change to "linux-arm64" if needed
GO_TARBALL="go$GO_VERSION.$GO_ARCH.tar.gz"

wget -q "https://go.dev/dl/$GO_TARBALL"
tar -xf "$GO_TARBALL"
sudo mv go mnt/usr/local/

# Ensure the filesystem has required directories
sudo mkdir -p mnt/{bin,lib,usr/bin,usr/lib}

# Unmount and finalize
sudo umount mnt
mv "$OUTPUT_IMAGE" "$OLDPWD/"

echo "Created Firecracker-compatible filesystem: $OLDPWD/$OUTPUT_IMAGE"
