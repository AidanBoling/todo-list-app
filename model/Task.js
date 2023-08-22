import mongoose from 'mongoose';
const { Schema, SchemaTypes, model } = mongoose;

const taskSchema = new Schema({ 
    title: { type: String, required: [true, 'Task title is missing'] },
    description: String,
    startDate: Date,
    dueDate: Date,
    projects: {
        type: [SchemaTypes.ObjectId],
        ref: 'Project',
        required: true,
      },
    tags: [String],
    priority: {
        type: Number,
        default: 0,
        min: 0,
        max: [3, '3 is max priority value allowed; got {VALUE}']
    },
    completed: {
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

taskSchema.pre('save', function(next) {
    this.updatedAt = Date.now(); // update the date every time a blog post is saved
    next();
  });

const Task = model('Task', taskSchema);
export default Task;