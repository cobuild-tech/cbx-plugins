# Porting forms

Read this when a unit contains reactive or template-driven forms, or
AngularJS form controllers.

- `[(ngModel)]` and `ng-model` become `value` + `onChange`.
- `FormGroup`/`FormControl` and AngularJS form controllers become
  controlled inputs, or react-hook-form for large forms.
- Validators become plain functions with the **same rules and messages**.
- Keep the same `touched`/`dirty`/`submitted` behavior, meaning errors
  appear at the same moment.
- `ng-model-options` (`debounce`, `updateOn`) becomes an explicit
  debounce, or update on blur.
- `(ngSubmit)` and `ng-submit` become `onSubmit` with `preventDefault()`.
