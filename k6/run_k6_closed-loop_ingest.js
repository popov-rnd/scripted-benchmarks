import http from 'k6/http';
import { SharedArray } from 'k6/data';

export const options = {
discardResponseBodies: true,
  scenarios: {
    closed: {
      executor: 'constant-vus',
      vus: __ENV.VUS ? parseInt(__ENV.VUS) : 100,
      duration: __ENV.DURATION ? __ENV.DURATION : '60s',
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

