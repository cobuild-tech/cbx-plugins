# Running COBOL and Rust together

Read this in the unit that sets up coexistence, and when a unit shares
files or tables with programs that haven't moved.

## Where Rust runs

Rust doesn't build for z/OS, but it does support Linux on IBM Z
(`s390x-unknown-linux-gnu`). Either run Rust in a Linux partition close to
the data, or move the datasets off the mainframe and run everything on
ordinary servers. Choose based on where the data needs to end up, not
where the code is easiest to run. Record the choice in `decisions.md`.

## Rules while both run

- **Read the same bytes.** The Rust side reads and writes every shared
  file in the old layout and encoding, through the codecs from
  `copybooks-layout.md`.
- A copybook used by many programs can't change until the last COBOL
  reader of it is gone.
- Datasets moved between platforms must transfer in binary mode. A text
  transfer converts packed fields and breaks them.
- Take turns to prove it: run COBOL, then Rust, then COBOL again on the
  same files. The files must come out identical to an all-COBOL run.
- Keep the clock the same on both sides (GnuCOBOL reads
  `COB_CURRENT_DATE`; have the Rust side read the same setting in tests).
