import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

export const ok_reqs = new Counter('ok_reqs');
export const ok_duration = new Trend('ok_duration', true);

export const options = {
  scenarios: {
    open: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.ARRIVAL_RATE || 2000),
      timeUnit: '1s',
      duration: __ENV.DURATION || '2m',
      preAllocatedVUs: 15000,
      maxVUs: 25000,
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
    'max'
  ],
};

export default function () {
	
  const timeout = __ENV.TIMEOUT || '60s';

  const res = http.get('http://127.0.0.1:8080/io', {
    timeout,
  });

  if (check(res, { 'status is 200': r => r.status === 200 })) {
	ok_reqs.add(1);
    ok_duration.add(res.timings.duration);
  }
}
