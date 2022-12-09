const Calendar = tui.Calendar;
const container = document.getElementById('calendar');
let workEventsCompleted = 0;
let healthEventsCompleted = 0;
let currentTaskType = null;
let currentTask = null;

let totalWorkEvents = 0;
let totalHealthEvents = 0;
let workBarDecrement = 0;
let healthBarDecrement = 0;
let endTime = 0;
let workScore = 1;
let healthScore = 1;
let schedule = [];
let debug = true;

let idleMediaQueryShrink = window.matchMedia('(max-width: 1600px)');
let idleMediaQueryTablet = window.matchMedia('(max-width: 1500px)');
let idleMediaQueryTabletSmall = window.matchMedia('(max-width: 1250px)');
let idleMediaQueryMobile = window.matchMedia('(max-width: 1050px)');
let idleMediaQueryMobileSmall = window.matchMedia('(max-width: 550px)');

if (debug == false) {
  totalWorkEvents = window.opener.totalWorkEvents;
  totalHealthEvents = window.opener.totalHealthEvents;
  workBarDecrement = window.opener.workBarDecrement;
  healthBarDecrement = window.opener.healthBarDecrement;
  endTime = window.opener.endTime;
  schedule = window.opener.schedule;
}

const options = {
  defaultView: 'day',
  week: {
    taskView: false,
    eventView: ['time'],
  },
  isReadOnly: true,
  // useFormPopup: true,
  // useDetailPopup: true,
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

calendar.createEvents(schedule);
startTime();
showIdleDisplay();

if (debug == false) {
  window.opener.close();
}

function startTime() {
  const today = new Date();
  let hours = today.getHours();
  let hoursFormatted = hours % 12;
  hoursFormatted = hoursFormatted ? hoursFormatted : 12;
  let min = today.getMinutes();
  let minFormatted = min < 10 ? '0' + min : min;
  let ampm = hours >= 12 ? 'PM' : 'AM';
  let sec = today.getSeconds();

  document.querySelector('#time').innerText =
    hoursFormatted + ':' + minFormatted + ' ' + ampm + ' ' + today.toLocaleString('default', { weekday: 'long' });

  for (sr in schedule) {
    if (min == schedule[sr].start.getMinutes() && hours == schedule[sr].start.getHours() && sec == 0) {
      startTask(schedule[sr]);
    }
  }

  if (currentTask && currentTask.end.getHours() == hours && currentTask.end.getMinutes() == min && sec == 0) {
    endTask();
  }

  if (!currentTask && schedule.length) {
    document.querySelector('.task-title').innerText = 'Next Task: ' + schedule[0].title;
    document.querySelector('.task-countdown').innerText =
      'Starts in: ' + msToTime(Date.parse(schedule[0].start.d.d) - Date.parse(today));
  }

  if (currentTask) {
    document.querySelector('.task-title').innerText = 'Ongoing Task: ' + currentTask.title;
    document.querySelector('.task-countdown').innerText =
      'Ends in: ' + msToTime(currentTask.end.d.d - Date.parse(today));
  }

  document.querySelector('.time-to-end').innerText = 'Voyage ends in: ' + msToTime(endTime - Date.parse(today));
  if (endTime <= Date.parse(today) || (!currentTask && !schedule.length)) if (!debug) dayEnded();

  if (!currentTaskType) setIdleHealthBar();
  else if (currentTaskType == 'work') setHealthBarDuringWork();
  else if (currentTaskType == 'health') setHealthBarDuringHealth();

  setTimeout(startTime, 1000);
}

function msToTime(ms) {
  let seconds = Math.floor((ms / 1000) % 60);
  let minutes = Math.floor((ms / (1000 * 60)) % 60);
  let hours = Math.floor((ms / (1000 * 60 * 60)) % 24);

  hours = hours < 10 ? '0' + hours : hours;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  seconds = seconds < 10 ? '0' + seconds : seconds;

  if (hours != '00') return hours + 'h:' + minutes + 'm:' + seconds + 's';
  else if (minutes != '00') return minutes + 'm:' + seconds + 's';
  else return seconds + 's';
}

function startTask(task) {
  currentTask = task;
  showPopup(task);
  console.log('Task Started: ' + currentTask.title);
}

function endTask() {
  console.log('task Ended: ' + currentTask.title);
  if (document.querySelector('.popup').style.visibility == 'visible') {
    reduceHealth();
  }
  document.querySelector('.popup').style.visibility = 'hidden';
  currentTask = null;
  currentTaskType = null;
  showIdleDisplay();
}

function showPopup(task) {
  document.querySelector('.popup').style.visibility = 'visible';
  if (task) {
    document.querySelector('.popup h1').innerText = 'Start Task: ' + task.title + '?';
    document.querySelector('.start-time').innerText = 'Starts at: ' + task.start.d.d.toLocaleTimeString();
    document.querySelector('.end-time').innerText = 'Ends at: ' + task.end.d.d.toLocaleTimeString();
    document.querySelector('.info').innerText =
      '⚑ Skipping this task will reduce your ' +
      (task.calendarId == 'cal-work' ? 'Spacecraft' : '') +
      ' Health by ' +
      Math.floor(getDecrement(task)) +
      '%';
  }
}

function getDecrement(task) {
  currentTask = task;
  if (task.calendarId == 'cal-work') {
    currentTaskType = 'work';
    return workBarDecrement;
  } else if (task.calendarId == 'cal-health') {
    currentTaskType = 'health';
    return healthBarDecrement;
  }
}

function popupYes() {
  console.log('Task Accepted');
  schedule.shift();
  document.querySelector('.popup').style.visibility = 'hidden';
  console.log(schedule);
  if (currentTask && currentTask.calendarId == 'cal-work') {
    workEventsCompleted++;
    showWorkDisplay();
  } else if (currentTask && currentTask.calendarId == 'cal-health') {
    healthEventsCompleted++;
    showHealthDisplay();
  }
}

function popupNo() {
  console.log('Task Declined');
  schedule.shift();
  document.querySelector('.popup').style.visibility = 'hidden';
  reduceHealth();
  endTask();
}

function reduceHealth() {
  let scoreBar = null;
  if (currentTaskType == 'work') {
    scoreBar = document.querySelector('.work-level');
    scoreBar.style.width = scoreBar.offsetWidth - (workBarDecrement * scoreBar.offsetWidth) / 100 + 'px';
    console.log('Spacecraft Health reduced by ' + workBarDecrement + '%');
  } else if (currentTaskType == 'health') {
    scoreBar = document.querySelector('.health-level');
    scoreBar.style.width = scoreBar.offsetWidth - (healthBarDecrement * scoreBar.offsetWidth) / 100 + 'px';
    console.log('Astronaut Health reduced by ' + healthBarDecrement + '%');
  }
}

function showIdleDisplay() {
  triggerFadeInAnimation();
  document.querySelector('.bgImg').style.visibility = 'visible';
  document.querySelector('.bgVid').style.visibility = 'hidden';
  setIdleHealthBar();
}

function setIdleHealthBar() {
  if (idleMediaQueryMobileSmall.matches) {
    document.querySelector('.health-bar').style.zIndex = '4';
    document.querySelector('.health-bar').style.left = 'auto';
    document.querySelector('.health-bar').style.right = '12%';
    document.querySelector('.health-bar').style.top = '720px';
  } else if (idleMediaQueryMobile.matches) {
    document.querySelector('.health-bar').style.zIndex = '4';
    document.querySelector('.health-bar').style.left = 'auto';
    document.querySelector('.health-bar').style.right = '155px';
    document.querySelector('.health-bar').style.top = '720px';
  } else {
    document.querySelector('.health-bar').style.top = '35%';
    if (idleMediaQueryTabletSmall.matches) {
      document.querySelector('.health-bar').style.left = '23%';
    } else if (idleMediaQueryTablet.matches) {
      document.querySelector('.health-bar').style.left = '27%';
    } else if (idleMediaQueryShrink.matches) {
      document.querySelector('.health-bar').style.left = '30%';
    } else {
      document.querySelector('.health-bar').style.left = '30%';
    }
  }
}

function showWorkDisplay() {
  triggerFadeInAnimation();
  document.querySelector('.bgImg').style.visibility = 'hidden';
  let videoDisplay = document.querySelector('.bgVid');
  videoDisplay.src = './../assets/work.mp4';
  videoDisplay.style.visibility = 'visible';
  setHealthBarDuringWork();
}

function setHealthBarDuringWork() {
  if (idleMediaQueryMobileSmall.matches) {
    document.querySelector('.health-bar').style.zIndex = '4';
    document.querySelector('.health-bar').style.left = 'auto';
    document.querySelector('.health-bar').style.right = '12%';
    document.querySelector('.health-bar').style.top = '720px';
  } else if (idleMediaQueryMobile.matches) {
    document.querySelector('.health-bar').style.zIndex = '4';
    document.querySelector('.health-bar').style.left = 'auto';
    document.querySelector('.health-bar').style.right = '155px';
    document.querySelector('.health-bar').style.top = '720px';
  } else {
    document.querySelector('.health-bar').style.top = '35%';
    if (idleMediaQueryTabletSmall.matches) {
      document.querySelector('.health-bar').style.top = '10%';
      document.querySelector('.health-bar').style.left = '17%';
    } else if (idleMediaQueryTablet.matches) {
      document.querySelector('.health-bar').style.top = '10%';
      document.querySelector('.health-bar').style.left = '20%';
    } else {
      document.querySelector('.health-bar').style.top = '10%';
      document.querySelector('.health-bar').style.left = '25%';
    }
  }
}

function showHealthDisplay() {
  triggerFadeInAnimation();
  document.querySelector('.bgImg').style.visibility = 'hidden';
  let videoDisplay = document.querySelector('.bgVid');
  videoDisplay.src = './../assets/health.mp4';
  videoDisplay.style.visibility = 'visible';
  setHealthBarDuringHealth();
}

function setHealthBarDuringHealth() {
  if (idleMediaQueryMobileSmall.matches) {
    document.querySelector('.health-bar').style.zIndex = '4';
    document.querySelector('.health-bar').style.left = 'auto';
    document.querySelector('.health-bar').style.right = '12%';
    document.querySelector('.health-bar').style.top = '720px';
  } else if (idleMediaQueryMobile.matches) {
    document.querySelector('.health-bar').style.zIndex = '4';
    document.querySelector('.health-bar').style.left = 'auto';
    document.querySelector('.health-bar').style.right = '155px';
    document.querySelector('.health-bar').style.top = '720px';
  } else {
    document.querySelector('.health-bar').style.top = '35%';
    if (idleMediaQueryTabletSmall.matches) {
      document.querySelector('.health-bar').style.top = '3%';
      document.querySelector('.health-bar').style.left = '30%';
    } else {
      document.querySelector('.health-bar').style.top = '3%';
      document.querySelector('.health-bar').style.left = '40%';
    }
  }
}

function triggerFadeInAnimation() {
  document.querySelector('.task-transition').classList.remove('fade-in-animation');
  document.querySelector('.task-transition').offsetWidth;
  document.querySelector('.task-transition').classList.add('fade-in-animation');
}

function dayEnded() {
  if (totalHealthEvents) healthScore = healthEventsCompleted / totalHealthEvents;
  if (totalWorkEvents) workScore = workEventsCompleted / totalWorkEvents;
  localStorage.setItem('healthEventsCompleted', healthEventsCompleted);
  localStorage.setItem('workEventsCompleted', workEventsCompleted);
  localStorage.setItem('totalHealthEvents', totalHealthEvents);
  localStorage.setItem('totalWorkEvents', totalWorkEvents);

  if (healthScore >= 0.5 && workScore >= 0.5) {
    window.location.href = 'end-good.html';
  } else if (healthScore < 0.5 && workScore < 0.5) {
    window.location.href = 'end-low-health-work.html';
  } else if (healthScore < 0.5) {
    window.location.href = 'end-low-health.html';
  } else if (workScore < 0.5) {
    window.location.href = 'end-low-work.html';
  }

  document.querySelector('.time-to-end').innerText = 'Mission Over';
}

function accessibilityToggle() {
  let A11yChecked = document.querySelector(".switch input[type='checkbox']").checked;
  if (A11yChecked) {
    console.log('here');
    document.querySelector('#calendar').style.backgroundColor = 'rgba(0, 13, 21, 1)';
    document.querySelector('.clock').style.backgroundColor = 'rgba(0, 17, 28, 1)';
    document.querySelector('.mission-info').style.backgroundColor = 'rgba(0, 17, 28, 1)';
    document.querySelector('.popup').style.backgroundColor = 'rgba(0, 17, 28, 1)';
    document.querySelector('.finish').style.backgroundColor = 'rgba(0, 17, 28, 1)';
    document.querySelector('.restart').style.backgroundColor = 'rgba(0, 17, 28, 1)';
  } else {
    document.querySelector('#calendar').style.backgroundColor = 'rgba(0, 25, 42, 0.75)';
    document.querySelector('.clock').style.backgroundColor = 'rgba(0, 25, 42, 0.6)';
    document.querySelector('.mission-info').style.backgroundColor = 'rgba(0, 25, 42, 0.6))';
    document.querySelector('.popup').style.backgroundColor = 'rgba(0, 25, 42, 0.6)';
    document.querySelector('.finish').style.backgroundColor = 'rgba(0, 25, 42, 0.6)';
    document.querySelector('.restart').style.backgroundColor = 'rgba(0, 25, 42, 0.6)';
  }
}

//TODO: add reflections in idle mode
//desktop notif
//fix health bar animation in that ending
//remove debug=false
//must have atleast one task
//FIX WEDNESDAY
