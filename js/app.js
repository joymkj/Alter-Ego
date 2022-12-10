const Calendar = tui.Calendar;
const container = document.getElementById('calendar');
let workEventsCompleted = 0;
let healthEventsCompleted = 0;
let currentTaskType = null;
let currentTask = null;
let workScore = 1;
let healthScore = 1;
let totalWorkEvents = window.opener.totalWorkEvents;
let totalHealthEvents = window.opener.totalHealthEvents;
let workBarDecrement = window.opener.workBarDecrement;
let healthBarDecrement = window.opener.healthBarDecrement;
let endTime = window.opener.endTime;
let schedule = window.opener.schedule;
let idleMediaQueryShrink = window.matchMedia('(max-width: 1600px)');
let idleMediaQueryTablet = window.matchMedia('(max-width: 1500px)');
let idleMediaQueryTabletSmall = window.matchMedia('(max-width: 1250px)');
let idleMediaQueryMobile = window.matchMedia('(max-width: 1050px)');
let idleMediaQueryMobileSmall = window.matchMedia('(max-width: 550px)');

//setting options for the calendar
const options = {
  defaultView: 'day',
  week: {
    taskView: false,
    eventView: ['time'],
  },
  isReadOnly: true,
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

//setting calendar style
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

//start app by populating calendar and playing default view
calendar.createEvents(schedule);
startTime();
showIdleDisplay();
window.opener.close();

//performs all time calculations and time-based tasks
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
  if (endTime <= Date.parse(today) || (!currentTask && !schedule.length)) dayEnded();

  if (!currentTaskType) setIdleHealthBar();
  else if (currentTaskType == 'work') setHealthBarDuringWork();
  else if (currentTaskType == 'health') setHealthBarDuringHealth();

  setTimeout(startTime, 1000);
}

//helper function to handle time calculations
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

//when a task begins
function startTask(task) {
  currentTask = task;
  showPopup(task);
  console.log('Task Started: ' + currentTask.title);
}

//when a task ends
function endTask() {
  console.log('task Ended: ' + currentTask.title);
  document.querySelector('.finish').innerText = 'End Day Early';
  if (document.querySelector('.popup').style.visibility == 'visible') {
    reduceHealth();
  }
  document.querySelector('.popup').style.visibility = 'hidden';
  currentTask = null;
  currentTaskType = null;
  showIdleDisplay();
}

//to display the popup when a task begins
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

//calculates loss of health or work points
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

//when clicked yes in the popup
function popupYes() {
  console.log('Task Accepted');
  schedule.shift();
  document.querySelector('.popup').style.visibility = 'hidden';
  document.querySelector('.finish').innerText = 'Task Completed Early';
  console.log(schedule);
  if (currentTask && currentTask.calendarId == 'cal-work') {
    workEventsCompleted++;
    showWorkDisplay();
  } else if (currentTask && currentTask.calendarId == 'cal-health') {
    healthEventsCompleted++;
    showHealthDisplay();
  }
}

//when clicked no in the popup
function popupNo() {
  console.log('Task Declined');
  schedule.shift();
  document.querySelector('.popup').style.visibility = 'hidden';
  reduceHealth();
  endTask();
}

//reduces health or work points when a task is declined
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

//visuals during no task
function showIdleDisplay() {
  triggerFadeInAnimation();
  document.querySelector('.bgImg').style.visibility = 'visible';
  document.querySelector('.bgVid').style.visibility = 'hidden';
  document.querySelector('.switch').style.visibility = 'visible';
  setIdleHealthBar();
}

//to handle responsive cases
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

//visuals during work task
function showWorkDisplay() {
  triggerFadeInAnimation();
  document.querySelector('.bgImg').style.visibility = 'hidden';
  document.querySelector('.switch').style.visibility = 'hidden';
  let videoDisplay = document.querySelector('.bgVid');
  videoDisplay.src = './../assets/work.mp4';
  videoDisplay.style.visibility = 'visible';
  setHealthBarDuringWork();
}

//to handle responsive cases during work task
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

//visuals during a health task
function showHealthDisplay() {
  triggerFadeInAnimation();
  document.querySelector('.bgImg').style.visibility = 'hidden';
  document.querySelector('.switch').style.visibility = 'hidden';
  let videoDisplay = document.querySelector('.bgVid');
  videoDisplay.src = './../assets/health.mp4';
  videoDisplay.style.visibility = 'visible';
  setHealthBarDuringHealth();
}

//to handle responsive cases during health task
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

//to show the fade from black transitions
function triggerFadeInAnimation() {
  document.querySelector('.task-transition').classList.remove('fade-in-animation');
  document.querySelector('.task-transition').offsetWidth;
  document.querySelector('.task-transition').classList.add('fade-in-animation');
}

//when the day/task end button is clicked
function dayEnded() {
  if (totalHealthEvents) healthScore = healthEventsCompleted / totalHealthEvents;
  if (totalWorkEvents) workScore = workEventsCompleted / totalWorkEvents;
  localStorage.setItem('healthEventsCompleted', healthEventsCompleted);
  localStorage.setItem('workEventsCompleted', workEventsCompleted);
  localStorage.setItem('totalHealthEvents', totalHealthEvents);
  localStorage.setItem('totalWorkEvents', totalWorkEvents);

  if (document.querySelector('.finish').innerText == 'End Day Early') {
    if (healthScore >= 0.5 && workScore >= 0.5) {
      window.location.href = 'end-success.html';
    } else if (healthScore < 0.5 && workScore < 0.5) {
      window.location.href = 'end-low-health-work.html';
    } else if (healthScore < 0.5) {
      window.location.href = 'end-low-health.html';
    } else if (workScore < 0.5) {
      window.location.href = 'end-low-work.html';
    }
  } else if (document.querySelector('.finish').innerText == 'Task Completed Early') {
    endTask();
  }

  document.querySelector('.time-to-end').innerText = 'Mission Over';
}

//when the accessibility toggle is clicked
function accessibilityToggle() {
  let A11yChecked = document.querySelector(".switch input[type='checkbox']").checked;
  if (A11yChecked) {
    document.querySelector('#calendar').style.backgroundColor = 'rgba(0, 13, 21, 1)';
    document.querySelector('.clock').style.backgroundColor = 'rgba(0, 17, 28, 1)';
    document.querySelector('.mission-info').style.backgroundColor = 'rgba(0, 17, 28, 1)';
    document.querySelector('.popup').style.backgroundColor = 'rgba(0, 17, 28, 1)';
    document.querySelector('.finish').style.backgroundColor = 'rgba(0, 17, 28, 1)';
    document.querySelector('.restart').style.backgroundColor = 'rgba(0, 17, 28, 1)';
  } else {
    document.querySelector('#calendar').style.backgroundColor = 'transparent';
    document.querySelector('.clock').style.backgroundColor = 'rgba(0, 25, 42, 0.6)';
    document.querySelector('.mission-info').style.backgroundColor = 'rgba(0, 25, 42, 0.6)';
    document.querySelector('.popup').style.backgroundColor = 'rgba(0, 25, 42, 0.85)';
    document.querySelector('.finish').style.backgroundColor = 'rgba(0, 25, 42, 0.6)';
    document.querySelector('.restart').style.backgroundColor = 'rgba(0, 25, 42, 0.6)';
  }
}
