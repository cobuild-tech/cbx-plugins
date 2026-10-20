# JCL, job steps, and the schedule

Read this in the unit that sets up coexistence, and in any unit that
replaces a job step.

- The natural unit of migration is a **job step**. A step reads some
  datasets and writes others. If a Rust program reads and writes exactly
  the same datasets in the same layout, the steps around it can't tell.
- For each step, record: `EXEC PGM=`, every `DD` and its dataset,
  disposition (`NEW`/`OLD`/`MOD`, keep or delete on failure), `COND` or
  `IF/THEN` logic, and return codes. Return codes become the Rust
  program's exit code, with the same values.
- `PARM=` and `SYSIN` control cards become command-line arguments or a
  config file.
- Utility steps (`SORT`/`DFSORT`, `IEBGENER`, `IDCAMS`) can stay as they
  are while the COBOL steps move. Port them last, if at all.
- **Parallel run in JCL:** after the COBOL step, add a step that runs Rust
  on the same input into a separate dataset, then a compare step. The
  COBOL output still goes downstream. After enough matching runs
  (including a month end), swap which output goes downstream and keep the
  COBOL step ready to switch back.
- If the job moves to a new scheduler, keep the same order, dependencies,
  and failure handling.
- The schedule is part of the inventory: daily, monthly, quarterly, and
  year-end jobs. A step isn't done until it has run through each cycle
  it belongs to.
