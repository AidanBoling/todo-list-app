import express from 'express';

const app = express();
const port = 3000;

let currentProjectView = 'Inbox';

app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }));

app.get('/', (req, res) => {
    const viewTasks = filterTasks(currentProjectView);
    res.render('index.ejs', {taskList: viewTasks, projectList: projects, listView: currentProjectView});
});


app.post('/add-task', (req, res) => {
    addTask(req.body['newTaskTitle'], req.body['newTaskProjects'], req.body['newTaskDue']);
    console.log(tasks);
    res.redirect('/');
});

app.post('/select-view', (req, res) => {
    currentProjectView = req.body['projectList'];
    console.log(currentProjectView);
    res.redirect('/');
});


app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });


function addTask(title, projects=[currentProjectView], dateDue='', dateStart='') {
    const id = tasks.length + 1;

    tasks.push({ id, title, projects, dateDue, dateStart });
}

function filterTasks(proj) {
    let projectTasks = [];

    tasks.forEach(task => {
        if (task['projects'].includes(proj)) { projectTasks.push(task) }
    });
    return projectTasks;
}


let tasks = [
    { id: 1, title: 'Example task 1', projects: ['Inbox', 'Personal'], dateDue: '', dateStart: '' },
    { id: 2, title: 'Example task 2', projects: ['Today', 'Work'], dateDue: '', dateStart: '' }
];

let projects = [
    'Today',
    'Inbox',
    'Personal',
    'Work'
]

