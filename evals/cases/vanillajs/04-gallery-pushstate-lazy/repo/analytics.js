// Vendor snippet: counts virtual page views by wrapping pushState. Loads first.
(function (push) {
  history.pushState = function () { var r = push.apply(history, arguments); navigator.sendBeacon('/pv', location.href); return r; };
})(history.pushState);
