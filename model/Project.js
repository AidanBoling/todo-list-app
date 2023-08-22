import mongoose from 'mongoose';
const { Schema, model } = mongoose;

const projectSchema = new Schema({ 
    name: { type: String, required: [true, 'Project name is missing'] },
    parents: [String],
    nestedProjects: [String],
    description: String,
    startDate: Date,
    dueDate: Date,
    tags: [String],
    icon: String,
    color: [Number],
    priority: {
        type: Number,
        default: 0,
        min: 0,
        max: 3,
    },
    completed: {
        type: Boolean,
        default: false,
    },
    archived: {
        type: Boolean,
        default: false,
    },
    createdAt: {     
        type: Date,
        default: () => Date.now(),
        immutable: true,
    },
    updatedAt: Date,
});

const Project = model('Project', projectSchema);
export default Project;