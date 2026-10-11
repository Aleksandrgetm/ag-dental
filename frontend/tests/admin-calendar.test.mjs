import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calendarRange,shiftDay,transitions} from '../src/services/admin/calendar.ts';
import {timeLabel} from '../src/services/booking/calendar.ts';
test('admin calendar bounds weeks, leap months and DST without changing instants',()=>{
 assert.deepEqual(calendarRange('2026-10-11','week').days,['2026-10-05','2026-10-06','2026-10-07','2026-10-08','2026-10-09','2026-10-10','2026-10-11']);
 assert.equal(calendarRange('2028-02-10','month').days.length,29);
 assert.equal(calendarRange('2026-12-31','list').to,'2027-01-30');
 assert.equal(shiftDay('2026-03-29',1),'2026-03-30');
 assert.equal(timeLabel('2026-03-29T01:30:00Z','en'),'04:30');
 assert.equal(timeLabel('2026-10-25T01:30:00Z','en'),'03:30');
});
test('terminal appointments cannot transition through the calendar',()=>{
 for(const status of ['completed','cancelled','rejected','no_show','unknown'])assert.deepEqual(transitions(status),[]);
 assert.deepEqual(transitions('pending'),['confirmed','cancelled','rejected']);
 assert.deepEqual(transitions('confirmed'),['completed','cancelled','no_show']);
});
