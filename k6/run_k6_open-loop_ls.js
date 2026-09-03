import http from 'k6/http';
import { Counter, Trend } from 'k6/metrics';


/*
 * Useful work (goodput): HTTP 200
 */
export const ok_reqs = new Counter('ok_reqs');
export const ok_duration = new Trend('ok_duration', true);


/*
 * Controlled load shedding: HTTP 503
 */
export const rejected_reqs = new Counter('rejected_reqs');
export const rejected_duration = new Trend('rejected_duration', true);


/*
 * Other server errors: HTTP 5xx
 */
export const server_error_reqs = new Counter('server_error_reqs');
export const server_error_duration = new Trend('server_error_duration', true);

/*
 * Downstream load shedding: HTTP 429
 */
export const downstream_429_reqs = new Counter('downstream_429_reqs');
export const downstream_429_duration = new Trend('downstream_429_duration', true);

/*
 * Other client errors: HTTP 4xx
 */
export const client_error_reqs = new Counter('client_error_reqs');
export const client_error_duration = new Trend('client_error_duration', true);


/*
 * k6 could not establish a TCP connection:
 *
 * 1210 - general TCP dial error
 * 1211 - dial timeout
 * 1212 - connection refused
 * 1213 - unknown dial error
 */
export const connection_failed_reqs =
  new Counter('connection_failed_reqs');


/*
 * Client deadline exceeded
 */
export const timed_out_reqs = new Counter('timed_out_reqs');


/*
 * Unexpected HTTP statuses and all remaining transport errors
 */
export const other_failed_reqs = new Counter('other_failed_reqs');



export const options = {
  discardResponseBodies: true,
  scenarios: {
    open: {
      executor: 'constant-arrival-rate',
      rate: Number(__ENV.ARRIVAL_RATE || 8000),
      timeUnit: '1s',
      duration: __ENV.DURATION || '2m',
      preAllocatedVUs: 1500,
      maxVUs: 20000,
    },
  },
  summaryTrendStats: [
    'min',
    'avg',
    'p(95)',
    'p(99)',
    'max'
  ],
};

export default function () {

  const timeout = __ENV.TIMEOUT || '1s';

  const res = http.get('http://127.0.0.1:8080/critical', {
    timeout,
  });

  /*
   * Successful goodput
   */
  if (res.status === 200) {
    ok_reqs.add(1);
    ok_duration.add(res.timings.duration);
    return;
  }

  /*
   * Intentional overload rejection
   */
  if (res.status === 503) {
    rejected_reqs.add(1);
    rejected_duration.add(res.timings.duration);
    return;
  }

  /*
   * Other server errros
   */
  if ( res.status >= 500 && res.status <= 599) {
    server_error_reqs.add(1, {status: String(res.status),});
    server_error_duration.add(res.timings.duration);
    return;
  }

 /*
  * 429 erros from downstream (for app and srv load-shedding)
  */
   if (res.status === 429) {
      downstream_429_reqs.add(1);
      downstream_429_duration.add(res.timings.duration);
      return;
   }


 /*
  * Other client errros
  */
  if (res.status >= 400 && res.status <= 499) {
    client_error_reqs.add(1, {
        status: String(res.status),
    });
    client_error_duration.add(res.timings.duration);
    return;
  }

  /*
   * Whole HTTP request exceeded the configured timeout.
   */
  if (res.error_code === 1050) {
    timed_out_reqs.add(1);
    return;
  }

 /*
  * TCP connection establishment failure.
  */
  if (res.error_code === 1210 || res.error_code === 1211 || res.error_code === 1212 || res.error_code === 1213) {
    connection_failed_reqs.add(1, {
      error_code: String(res.error_code),
    });
   return;
  }

  /*
   * Everything else
   */
    other_failed_reqs.add(1, {
        status: String(res.status || 0),
        error_code: String(res.error_code || 0),
        error: String(res.error || ''),
    });

  
}
