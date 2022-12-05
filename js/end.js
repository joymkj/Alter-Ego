let healthEventsCompleted = localStorage.getItem('healthEventsCompleted');
let workEventsCompleted = localStorage.getItem('workEventsCompleted');
let totalHealthEvents = localStorage.getItem('totalHealthEvents');
let totalWorkEvents = localStorage.getItem('totalWorkEvents');

document.querySelector('.health-info').innerText =
  'Health tasks completed: ' + healthEventsCompleted + '/' + totalHealthEvents;
document.querySelector('.work-info').innerText = 'Work tasks completed: ' + workEventsCompleted + '/' + totalWorkEvents;
