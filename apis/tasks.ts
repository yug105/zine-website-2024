import { db } from '../firebase';
import { collection, addDoc, getDoc, DocumentReference, Timestamp, updateDoc, doc, deleteDoc, getDocs, query, where } from "firebase/firestore";
import { createRoom, getRoom } from './room';
import { IUserProject, createProject, deleteProject } from './projects';
import { IUser, addUserRoom, getUserEmailIn } from './users';
import sendFCMMessage from './sendFcm';
import axios from 'axios';

export const tasksCollection = collection(db, "tasks");

export interface ITaskData {
    id: string;
    title: string;
    type: "Team" | "Individual";
    link: "";
    subheading: "";
    description: string;
    submissionLink: string;
    dueDate: Date;
    mentors: string[];
    createRoom: boolean;
    roomName?: string;
    tags?: string[];
    roles:string[];
    available?: boolean;
}

export const fetchTasks = async () => {
    const res = await axios.get('http://localhost:8080/tasks')
    console.log(res.data)
    return res.data;
    // return getDocs(tasksCollection)
}
export const fetchindtasks = async (taskid: string) => {
    const res = await axios.get(`/tasks/${taskid}`)
    return res.data
}

interface ITaskCreateData {
    title: string;
    type: 'Individual' | 'Team';
    link: string;
    subheading: string;
    description: string;
    submissionLink: string;
    dueDate: Date;
    mentors: string[];
    createRoom: boolean;
    roomName?: string; // if createRoom is true
    roles?:string[];
    available?: boolean;
}

export const createTask = async (data: ITaskCreateData) => {
    var roomid = null;
    if (data.createRoom == false && data.roomName) roomid = getRoom(data.roomName)

    const taskData = {
        ...data,
        createdDate: Timestamp.fromDate(new Date()),
        roomid,
        dueDate:  Timestamp.fromDate(data.dueDate)
    }
    const res= await axios.post("/tasks", taskData)
    return res.data
    return addDoc(tasksCollection, taskData)
}

export const editTask = async (taskid: string, data: ITaskCreateData) => {
    var roomid = null;
    if (data.createRoom == false && data.roomName) roomid = getRoom(data.roomName)

    const taskData = {
        ...data,
        createdDate: new Date(),
        roomid,
        dueDate:  data.dueDate
    }

    console.log(taskData, taskid)
    const res = await axios.put(`/tasks/${taskid}`, taskData)
    return res.data
    return updateDoc(doc(tasksCollection, taskid), taskData)
}

export const deleteTask = async (taskid: string) => {
    const res = await axios.delete(`/tasks/${taskid}`)
    return res.data
    return deleteDoc(doc(tasksCollection, taskid))
}

const createTaskRoom = async (task: ITaskData, groups: IUser[][]) => {
    const mentorSnapshot = await getUserEmailIn(task.mentors)
    const mentors = mentorSnapshot.docs.map(d => d.data() as IUser)
    console.log('mentors', mentors)

    if (task.createRoom) {
        // Create room automatically
        return Promise.all(groups.map(async (g) => {
            console.log('group', g)
            const roomName = task.roomName || `${task.title.split(' ')[0]}-${g[0].email.slice(4).split('@')[0]}`
            const room = await createRoom(roomName, [], "project", "", "")
            const members = g.concat(mentors)
    
            await Promise.all(members.map(m => addUserRoom(m, [roomName], [room.id])))
            return sendFCMMessage(roomName, `Project Room Created`, `Ask your doubts related to ${task.title} project to your mentors in this channel`)
        }))
    } else {
        // Add user to already existing room
        const room = await getRoom(task.roomName!)
        return Promise.all(groups.map(async (g) => {
            await Promise.all(g.map(async u => await addUserRoom(u, [task.roomName!], [room.docs[0].id])))
        }))
    }
}

export const assignTask = async (task: ITaskData, users: IUser[]) => {
    if (!users.length) return
    if (task.type === 'Individual') {
        const projects = await Promise.all(users.map(async u => await createProject(task.id, [u.uid])))
        
        // All in seperate groups
        await createTaskRoom(task, users.map(u => [u]))
        return projects
    } else {
        const projects = await createProject(task.id, users.map(u => u.uid))

        // All in one group
        await createTaskRoom(task, [users])
        return projects
    }
}