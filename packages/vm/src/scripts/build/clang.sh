#!/bin/bash
set -euo pipefail
trap 'cleanup' EXIT

OUTPUT_IMAGE="clang.ext4"
IMAGE_SIZE="64M"
CLANG_VERSION="18"  # Change this to the version you need

cleanup() {
    [ -d "$TMPDIR" ] && sudo umount -l "$TMPDIR/mnt" 2>/dev/null || true
    rm -rf "$TMPDIR"
    losetup -D 2>/dev/null || true
}

TMPDIR=$(mktemp -d)
cd "$TMPDIR"

# Create an empty ext4 filesystem
dd if=/dev/zero of="$OUTPUT_IMAGE" bs=1M count=64
mkfs.ext4 -q -O ^has_journal "$OUTPUT_IMAGE"

# Mount it
mkdir -p mnt
sudo mount -o loop "$OUTPUT_IMAGE" mnt

# Download and install Clang
CLANG_ARCH="x86_64-linux-gnu"  # Change to arm64 if needed
CLANG_TARBALL="clang+llvm-$CLANG_VERSION.0.0-$CLANG_ARCH.tar.xz"

wget -q "https://github.com/llvm/llvm-project/releases/download/llvmorg-$CLANG_VERSION.0.0/$CLANG_TARBALL"
tar -xf "$CLANG_TARBALL"
sudo cp -r clang+llvm-$CLANG_VERSION.0.0-$CLANG_ARCH/* mnt/usr/

# Ensure the filesystem has required directories
sudo mkdir -p mnt/{bin,lib,usr/bin,usr/lib}

# Unmount and finalize
sudo umount mnt
mv "$OUTPUT_IMAGE" "$OLDPWD/"

echo "Created Firecracker-compatible filesystem: $OLDPWD/$OUTPUT_IMAGE"
