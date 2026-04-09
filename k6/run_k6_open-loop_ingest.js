import http from 'k6/http';
import { SharedArray } from 'k6/data';

export const options = {
  scenarios: {
    open: {
      executor: 'constant-arrival-rate',
      rate: __ENV.ARRIVAL_RATE ? parseInt(__ENV.ARRIVAL_RATE) : 1000
      timeUnit: '1s',
      duration: __ENV.DURATION ? __ENV.DURATION : '5m',
      preAllocatedVUs: 1000,
      maxVUs: 20000,
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
    'max'
  ],
};

const payloads = new SharedArray('payloads', function () {
  return open('./payloads.txt').split('\n');
});

export default function () {
  const body = payloads[Math.floor(Math.random() * payloads.length)];

  http.post('http://127.0.0.1:8080/ingest', body, {
    headers: { 'Content-Type': 'application/json' }
  });
}
