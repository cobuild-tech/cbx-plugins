# Identifying the COBOL setup

Read this in the Assess step. Record in `state.json` and `assessment.md`:

- **Compiler and platform:** IBM Enterprise COBOL on z/OS, Micro Focus,
  GnuCOBOL, or another. Record `"flavor"` as, for example,
  `"ibm-zos-batch"`, `"ibm-zos-cics"`, `"microfocus"`, or
  `"gnucobol-batch"`. Compiler options (`TRUNC`, `ARITH`, `NUMPROC`) change
  arithmetic; list the ones in the build.
- **Batch, online, or both:** JCL-driven batch jobs, CICS or IMS online
  transactions, or programs run from a menu (`ACCEPT`/`DISPLAY`).
- **Data stores:** sequential files, VSAM (KSDS/ESDS/RRDS), indexed files,
  DB2 or other SQL, IMS DB. Who owns each one.
- **Encoding:** EBCDIC (and which code page, usually 037 or 1140) or
  ASCII. Which fields are packed (`COMP-3`), binary (`COMP`/`COMP-4`/
  `COMP-5`), or display digits.
- **The schedule:** what runs daily, monthly, quarterly, and at year end.
  Year-end jobs are easy to miss.
- **A non-mainframe compiler:** whether the code builds on GnuCOBOL, so
  golden data can be recorded locally. Its defaults differ from IBM's;
  check them against real mainframe output before trusting them.
- **Should it move?** If the system is stable, rarely changes, and costs
  are fine, say so. Wrapping it in an API is a valid answer.
