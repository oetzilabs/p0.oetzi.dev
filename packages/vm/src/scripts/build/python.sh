#!/bin/bash
set -euo pipefail
trap 'cleanup' EXIT

OUTPUT_IMAGE="python.ext4"
IMAGE_SIZE="512M"
PYTHON_VERSION="3.11.0"  # Change this to the version you need

cleanup() {
    [ -d "$TMPDIR" ] && sudo umount -l "$TMPDIR/mnt" 2>/dev/null || true
    rm -rf "$TMPDIR"
    losetup -D 2>/dev/null || true
}

TMPDIR=$(mktemp -d)
cd "$TMPDIR"

# Create an empty ext4 filesystem
dd if=/dev/zero of="$OUTPUT_IMAGE" bs=1M count=512
mkfs.ext4 -q -O ^has_journal,^extent "$OUTPUT_IMAGE"

# Mount it
mkdir -p mnt
sudo mount -o loop "$OUTPUT_IMAGE" mnt

# Download and install Python
PYTHON_ARCH="linux-x86_64"  # Change to arm64 if needed
PYTHON_TARBALL="Python-$PYTHON_VERSION.tgz"

wget -q "https://www.python.org/ftp/python/$PYTHON_VERSION/$PYTHON_TARBALL"
tar -xf "$PYTHON_TARBALL"

# Install dependencies (make, gcc, etc.) for building Python from source
sudo apt-get update
sudo apt-get install -y build-essential zlib1g-dev libssl-dev libncurses5-dev \
libgdbm-dev libnss3-dev libreadline-dev libffi-dev curl

# Build Python from source
cd "Python-$PYTHON_VERSION"
./configure --prefix=/mnt/usr --enable-optimizations
make -j"$(nproc)"
make install

# Install Uvicorn globally in the system
python3 -m pip install --upgrade pip
python3 -m pip install uvicorn

# Ensure the filesystem has the required directories
sudo mkdir -p mnt/{bin,lib,usr/bin,usr/lib}

# Unmount and finalize
sudo umount mnt
mv "$OUTPUT_IMAGE" "$OLDPWD/"

echo "Created Firecracker-compatible filesystem: $OLDPWD/$OUTPUT_IMAGE"
