# Requirements

1. Download and install dependencies once
2. Run with: `sudo ./build/<language>.sh` (needs sudo for mounting, the languages are `clang`, `golang`, `nodejs`, `rustlang`, `python`)
3. Find the `.ext4` file in your current directory

**Safety Features:**

1. Uses `mktemp` for disposable workspace
2. Automatic cleanup on exit (including forced exits)
3. No persistent system changes
4. All operations contained within temporary directory
5. Explicit loop device management

**Requirements:**

```bash
# Install the common dependencies once
sudo apt install e2fsprogs build-essential rustc golang nodejs python3-pip curl

# For building Python from source (Python 3 and associated libraries)
sudo apt install zlib1g-dev libssl-dev libncurses5-dev libgdbm-dev libnss3-dev libreadline-dev libffi-dev
```

**Note:** These scripts need `sudo` only for mounting operations. They won't modify your system outside the temporary directory created during execution.
