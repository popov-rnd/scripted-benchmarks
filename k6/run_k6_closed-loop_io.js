import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

export const ok_reqs = new Counter('ok_reqs');
export const ok_duration = new Trend('ok_duration', true);

export const options = {
  discardResponseBodies: true,

  scenarios: {
    closed: {
      executor: 'constant-vus',
      vus: Number(__ENV.VUS || 200),
      duration: __ENV.DURATION || '30s',
    },
  },

  summaryTrendStats: [
    'min',
    'avg',
    'med',
    'p(50)',
    'p(75)',
    'p(95)',
    'p(99)',
    'p(99.9)',
    'max',
  ],

  noConnectionReuse: false,
};

export default function () {
  const res = http.get('http://127.0.0.1:8080/io');

  if (check(res, { 'status is 200': r => r.status === 200 })) {
	ok_reqs.add(1);
    ok_duration.add(res.timings.duration);
  }
}
