import express from 'express';
// import dayjs from 'dayjs';
import mongoose, { isObjectIdOrHexString, Types } from 'mongoose';
import Task from './model/Task.js';
import Project from './model/Project.js';

const app = express();
const port = 3000;
mongoose.connect('mongodb://127.0.0.1:27017/test');

let currentProjectView = await Project.findOne({name: 'Inbox'}).select('name');
const allProjects = await Project.find({}, 'name');

app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }));


app.get('/', async (req, res) => {
    // const projectTasks = await Task.where('projects').equals(`${currentProjectView._ids}`);
    const projectTasks = await Task.find({ projects: { $in: [currentProjectView._id] } }).populate('projects', 'name');

    // const projectTasks = filterTasks(currentProjectView);
    res.render('index.ejs', {taskList: projectTasks, projectList: allProjects, listView: currentProjectView.name});
});


app.post('/select-view', async (req, res) => {
    currentProjectView = await Project.findOne({name: `${req.body.projectList}`}).select({name: 1});

    console.log(currentProjectView);
    res.redirect('/');
});


app.post('/create/task', (req, res) => {
    addTask(req.body.newTaskTitle, req.body.newTaskProjects, req.body.newTaskDue);
    res.redirect('/');
});


app.post('/edit/task/:id', async (req, res) => {
	const editedTaskID = req.params.id;
	const matchedTask = await Task.findById(editedTaskID).exec();
	
    if (matchedTask) { 
		console.log('match!'); 
        updateTask(matchedTask, req.body);

        // console.log(matchedTask);
        // console.log(req.body.keys());
		// res.render('post.ejs', { post: matchedPost });
	}
	else { console.log('No match found.'); }
    res.redirect('/');
});


// Archives task when checkbox checked
app.post('/complete', async (req, res) => {
    console.log(req.body.complete);

    const completedTask = await Task.findById(req.body.complete).exec();
    if (completedTask) { 
        completedTask.completed = true;
        try { 
            await completedTask.save(); 
            console.log('Task marked complete');
        } catch (error) { console.log(error); }
    } else { console.log('Task not found'); }
    
    res.redirect('/');
});


app.post('/delete/task', async (req, res) => {
    const taskID = req.body.deleteTask;
    const taskToDelete = await Task.findById(taskID).exec();
    console.log('Deleting task...\n', taskToDelete);

    const deleteTask = await Task.deleteOne({ _id: taskID });
    console.log(deleteTask);

    res.redirect('/');
});



// //for purposes of WebDev "challenge", might do this to have dynamic pages for views:
// app.post('/view/:selected', async (req, res) => { 
//     const viewName = req.params.selected;
//     const view = await View.findOne({name: viewName }).select({name: 1}); 
    
//     if (view) { 
//         const viewTasks = await Task.find({ views: { $in: view } }).populate('projects', 'name');
//         res.render('view.ejs)', {taskList: viewTasks, projectList: allProjects, listView: view.name})
//     } else {
//         res.redirect('/');
//     }  
// });



// app.post('/create-project', (req, res) => {

//include an "update projects list" here
// });




app.listen(port, () => {
    console.log(`Listening on port ${port}`);
  });


async function addTask(title, projects=[currentProjectView._id], dateDue='', dateStart='') {

    let projectIds = [];
    const taskProjects = await Project.find({ name: { $in: projects } }, '_id');
    console.log(taskProjects);

    if (taskProjects) {
        taskProjects.forEach(project => {
            projectIds.push(project.id);
        });


    } else {console.log('No matching projects found')}
    console.log(projectIds);

    if (projectIds.length > 0) {

        const task = await Task.create({
            title: title,
            startDate: dateStart,
            dueDate: dateDue,
            projects: projectIds,
        });

        console.log(task);
    }
}


async function updateTask(task, requestBody) {
    const fields = Object.keys(requestBody);
    console.log(fields);

    fields.forEach(async (field) => {
        console.log(field);

        if (field === 'taskProjects') {         // Handle projects fields
            let convertedArray = [];
            let projectsToRemove = [];

            if (typeof requestBody[field] === 'string') { convertedArray.push(requestBody[field]); }
            else { convertedArray = requestBody[field]; }

            const updatePush = await Task.updateOne({_id: task._id}, { $addToSet: { projects: { $each: convertedArray } } });

            // Test if each of existing projects is in the update; if one of existing is NOT in update, remove project from task
            task.projects.forEach(project => {
                if (!convertedArray.includes(project.toString())) { projectsToRemove.push(project); }
            });

            // console.log(`Projects to remove: `)
            // console.log(projectsToRemove);         

            // Pull all projects that are in the projectsToRemove array:
            const updatePull = await Task.updateOne({_id: task._id}, { $pull: { projects: {$in : projectsToRemove} } });

        } else {  // Handle all other fields
            let updatedField = {};

            if (field === 'dueDate' || field === 'startDate') {
                const dateProper = dateFix(requestBody[field]);
                console.log(dateProper);
              
                if (!task[field] && requestBody[field] !== '') { 
                    console.log("Set equal -- Task doesn't already have this Date field, and reqBody is not empty");
                    updatedField = {[field]: dateProper};
                } else if (task[field]) {
                    // console.log('Task already has field: ' + field); 
                    if (`${dateProper}` !== `${task[field]}`) { 
                        console.log(`Set equal -- Task, ${task[field]}, does not match Request, ${dateProper}`);
                        updatedField = {[field]: dateProper};
                    }
                } else { console.log('No updates made for this field') }

            } else {
                let updatedField = {};

                if (!task[field] && requestBody[field] !== '') { 
                    console.log("Set equal -- Task doesn't already have this field, and reqBody is not empty");
                    updatedField = {[field]: requestBody[field]};
                } else if (task[field]) {
                    console.log('Task has field: ' + field); 

                    if (requestBody[field] !== task[field]) { 
                        console.log(`Set equal -- Task, ${task[field]}, does not match Request, ${requestBody[field]}`);
                        updatedField = {[field]: requestBody[field]};
                    } else { console.log('No update -- Task and request values are the same'); }

                } else { console.log(`Task does NOT have field ${field}, and request field is empty`); } 
            }
            const updated = await Task.updateOne({_id: task._id}, updatedField, {upsert:true});
        }
    });
    const updatedTask = await Task.findById(task._id).exec();
    console.log(updatedTask);
}


function dateFix(date) {
    if (date !== '') {
        console.log(date);
        const d = new Date(date);
        const year = d.getFullYear();
        const month = d.getMonth();
        const day = d.getDate() + 1;
        // const datestring = d.getFullYear().toString().padStart(4, '0') + '-' + (d.getMonth() + 1).toString().padStart(2, '0') + '-' + (d.getDate() + 1).toString().padStart(2, '0');
        // console.log(datestring);
        
        const dateObj = new Date(year, month, day);
        console.log(dateObj);
        return dateObj;
        // return d;
    } else { return '' }
} 



// async function filterTasks(proj) {
//     const filteredTasks = await Task.where('projects').equals(`${proj}`);

//     // projectTasks.forEach(task => {
//     //     if (task['projects'].includes(proj)) { projectTasks.push(task) }
//     // });
//     return filteredTasks;
// }

// ----------------------------------------

// [x] TODO: Add ability to delete tasks
// TODO: Add ability to create new projects (option from dropdown)
// TODO: Add ability to delete projects

// TODO: Create "pages" for individual projects and tasks
    // Note: Probably do want a 'task.ejs' page, and a 'project.ejs' page, and a 'settings.ejs' page, so
    // maybe also want a 'views.ejs' page -- would be for custom/filtered views, when/if I figure 
    // out how to implement that...

// TODO: Add ability to archive projects

// TODO: Fix the cursor for the title menu (shouldn't be pointer
    // except over the toggle button)


// -----------------------------------

// NOTES/Snippets (temp)

// const project = await Project.create({
//     name: 'Work',
//   });

//   console.log(project);

// const projectNames = [];

// if (req.body['newTaskProjects']) { projectNames = req.body['newTaskProjects']; }
// else { projectNames = [currentProjectView]; }

// projectNames.forEach(projectName => {
//     const taskProject = await Project.where('name').equals(`${projectName}`).select('_id');
//     projectNames.push(taskProject.id);
// });


// const task = await Task.create({
//     title: 'Initial test task',
//     projects: [project._id],
//   });


// console.log(task);

// const testTaskRequest = await Task.find({}).populate('projects', 'name').exec();
// console.log(testTaskRequest);



// const taskToUpdate = await Task.findOne({title: 'Initial test task'}).select({projects: 1}).exec();
// let taskProjects = taskToUpdate.projects;
// console.log(taskToUpdate);
// console.log(taskProjects);

// const projectToAdd = await Project.findOne({name: 'Work'}).select({_id: 1}).exec();
// // const projectsToAdd = await Project.where('name').equals('Work').select('_id').exec();
// console.log(projectToAdd);

// taskProjects.push(projectToAdd._id);
// console.log(taskProjects);
// const updatedTask = await Task.findOneAndUpdate({_id: taskToUpdate._id}, {projects: taskProjects}, {new: true});
// console.log(updatedTask);

// const task = await Task.findOne({title: 'Initial test task'}).select({projects: 1, title:1}).populate('projects', 'name');
// console.log(task);

// const projects = await Project.find({}, 'name');
// [
//     'Today',
//     'Inbox',
//     'Personal',
//     'Work'
// ]


