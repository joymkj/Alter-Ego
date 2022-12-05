console.log('fsasd');
const Calendar = tui.Calendar;
const container = document.getElementById('calendar');
let eventsID = 0;
window.totalWorkEvents = 0;
window.totalHealthEvents = 0;
window.workBarDecrement = 0;
window.healthBarDecrement = 0;
window.endTime = 0;
window.schedule = [];

const options = {
  defaultView: 'day',
  week: {
    taskView: false,
    eventView: ['time'],
  },
  useFormPopup: true,
  useDetailPopup: true,
  timezone: {
    zones: [
      {
        timezoneName: 'America/New_York',
        displayLabel: 'America/New_York',
      },
    ],
  },
  calendars: [
    {
      id: 'cal-work',
      name: 'Work',
      backgroundColor: '#F4B400',
    },
    {
      id: 'cal-health',
      name: 'Health',
      color: 'white',
      backgroundColor: '#DB4437',
    },
  ],
};

const calendar = new Calendar(container, options);

calendar.setTheme({
  common: {
    backgroundColor: 'rgba(7, 34, 58, 1)',
    border: '6px dotted #ffffff',
    dayName: { color: 'white' },
    today: { color: 'white' },
    holiday: { color: 'white' },
    saturday: { color: 'white' },
    gridSelection: {
      backgroundColor: 'rgba(0, 25, 42, 0.9)',
      border: '1px dotted #ffffff',
    },
  },
  week: {
    nowIndicatorLabel: { color: 'white' },
    nowIndicatorPast: { border: 'white' },
    nowIndicatorBullet: { backgroundColor: 'white' },
    nowIndicatorFuture: { border: 'red' },
    pastTime: { color: 'white' },
    futureTime: { color: 'white' },
    dayName: {
      borderLeft: 'none',
      borderTop: 'none',
      borderBottom: 'none',
      backgroundColor: 'none',
    },
    timeGridLeft: {
      width: 45,
    },
  },
});

// calendar.createEvents(schedule);

calendar.on('beforeCreateEvent', (eventObj) => {
  eventObj.id = eventsID;
  calendar.createEvents([
    {
      ...eventObj,
    },
  ]);
  eventsID++;
  console.log('Event created: ' + eventObj);
  calendar.clearGridSelections();
});

calendar.on('beforeUpdateEvent', function ({ event, changes }) {
  const { id, calendarId } = event;
  calendar.updateEvent(id, calendarId, changes);
  console.log('Event Updated: ' + event);
});

calendar.on('beforeDeleteEvent', (eventObj) => {
  calendar.deleteEvent(eventObj.id, eventObj.calendarId);
});

let replacer = function (key, value) {
  if (this[key] instanceof Date) {
    return this[key].toString();
  }
  return value;
};

function startScheduling() {
  document.querySelector('#calendar').style.visibility = 'visible';
  document.querySelector('.start-app').style.visibility = 'visible';
}

function startApp() {
  schedule = [];
  for (let i = 0; i <= eventsID; i++) {
    let ev = calendar.getEvent(i, 'cal-work');
    if (!ev) ev = calendar.getEvent(i, 'cal-health');
    if (ev && ev.start.d.d > new Date()) {
      if (ev.calendarId == 'cal-work') totalWorkEvents++;
      else if (ev.calendarId == 'cal-health') totalHealthEvents++;
      schedule.push(ev);
    }
  }
  schedule.sort((a, b) => a.start.d.d - b.start.d.d);
  console.log("App started. Today's schedule: ");
  console.log(schedule);
  workBarDecrement = 100 / totalWorkEvents;
  healthBarDecrement = 100 / totalHealthEvents;
  if (schedule.length) endTime = schedule[schedule.length - 1].end.d.d;
  console.log('in cover');
  console.log(schedule);
  window.open('app/app.html');
}
