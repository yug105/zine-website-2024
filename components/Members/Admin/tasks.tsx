import React, { useEffect, useState } from "react";
import SideNav from "../sidenav";
import styles from "../../../constants/styles";
import ProtectedRoute from "./ProtectedRoute";
import { ToastContainer, toast } from "react-toastify";
import { ITaskData, assignTask, createTask, deleteTask, editTask, fetchTasks } from "../../../apis/tasks";
import { Control, useFieldArray, useForm } from "react-hook-form";
import { IUser, getUserEmailIn } from "../../../apis/users";
import Modal from "../modal";
import { IRoleData, fetchRoles } from "../../../apis/roles";


interface ITaskForm {
    title: string;
    type: "Team" | "Individual";
    link: "";
    subheading: "";
    description: string;
    submissionLink?: string;
    dueDate: Date;
    mentors: { value: string }[];
    createRoom: boolean;
    roomName?: string;
    roles: { value: string }[];
    available?: boolean;
}

interface IState {
    search: string;
    editing: boolean;
    editingID: string;
    deleteTask: ITaskData | null;
    assignTask: ITaskData | null;
}

interface IAssignState {
    input: string;
    emails: string[];
}

interface RoleListInputProps {
    control: Control<ITaskForm, any>;
    roles: IRoleData[];
}

const EmailListInput = ({ control }: { control: Control<ITaskForm, any> }) => {
    const { fields, append, remove } = useFieldArray({ control, name: 'mentors' });
    const [nextEmail, setNextEmail] = useState('')
    const handleAddEmail = () => {
        nextEmail.split(/[ ,]+/).map(e => {
            if (fields.some(f => f.value === e)) return
            if (!/^\S+@\S+\.\S+$/.test(e)) return
            append({ value: e });
            setNextEmail("")
        })
    };

    return (
        <div>
            <div className="flex text-sm font-medium flex-wrap gap-1">
                {fields.map((field, index) => (
                    <div key={field.id} className="flex py-1 px-2 rounded-3xl" style={{background: "#C2FFF48A", color: "#0C72B0F2"}}>
                        <input className="font-medium" disabled {...field} />
                        <button className="ml-2" type="button" onClick={() => remove(index)}>✕</button>
                    </div>
                ))}
            </div>
            <div className="flex mt-1">
                <input type='text' className="block w-full focus:outline-none bottom-border pt-2 px-1" value={nextEmail} onChange={(e) => setNextEmail(e.target.value)} />
                <button type="button" className="text-white rounded-md ml-2 px-2 py-1" style={{ background: "#0C72B0" }} onClick={handleAddEmail}>Add</button>
            </div>
        </div>
    );
};

const RoleListInput = ( { control, roles}: RoleListInputProps) => {
    const { fields, append, remove } = useFieldArray({ control, name: 'roles' });
    const [nextRole, setNextRole] = useState('')
    const handleAddRole = () => {
        nextRole.split(/[ ,]+/).map(e => {
            console.log(e)
            if (roles.some(r=> r.name == e)) {}
            else return
            if (fields.some(f => f.value === e)) return
            append({ value: e });
            setNextRole("")
        })
    };

    return (
        <div>
            <div className="flex text-sm font-medium flex-wrap gap-1">
                {fields.map((field, index) => (
                    <div key={field.id} className="flex py-1 px-2 rounded-3xl" style={{background: "#C2FFF48A", color: "#0C72B0F2"}}>
                        <input className="font-medium" disabled {...field} />
                        <button className="ml-2" type="button" onClick={() => remove(index)}>✕</button>
                    </div>
                ))}
            </div>
            <div className="flex mt-1">
                <input type='text' className="block w-full focus:outline-none bottom-border pt-2 px-1" value={nextRole} onChange={(e) => setNextRole(e.target.value)} />
                <button type="button" className="text-white rounded-md ml-2 px-2 py-1" style={{ background: "#0C72B0" }} onClick={handleAddRole}>Add</button>
            </div>
        </div>
    );
};


const Tasks = () => {
    const [state, setState] = useState<IState>({ search: "", editing: false, editingID: "", assignTask: null, deleteTask: null })
    const [assignState, setAssignState] = useState<IAssignState>({ input: "", emails: [] })
    const [tasks, setTasks] = useState<ITaskData[]>([])
    const [roles, setRoles] = useState<IRoleData[]>([])

    const { register, watch, handleSubmit, setValue, reset, control, formState: { errors } } = useForm<ITaskForm>()
    const watchCreateRoom = watch('createRoom', false)

    const onSubmit = async (data: ITaskForm) => {
        const { mentors, submissionLink, roles, ...formData } = data
        const mentorsArray = mentors.map(m => m.value)
        const rolesArray = roles.map(r => r.value)

        createTask({ submissionLink: submissionLink || "", mentors: mentorsArray, roles: rolesArray, ...formData }).then(task => {
            toast.success("Task successfully created!")
            reset()
            console.log("Task created:", task.id)
        }).catch((err) => {
            console.log(err)
            toast.error("An error occurred. Contact zine team")
        })
    }

    const onEdit = async (data: ITaskForm) => {
        const { mentors, submissionLink, roles, ...formData } = data
        const mentorsArray = mentors.map(m => m.value)
        const rolesArray = roles.map(r => r.value)

        reset()
        editTask(state.editingID, { submissionLink: submissionLink || "", mentors: mentorsArray, roles: rolesArray, ...formData }).then(task => {
            toast.success("Task successfully edited!")
            setState({ ...state, editing: false, editingID: "" })
        }).catch((err) => {
            console.log(err)
            toast.error("An error occurred. Contact zine team")
        })
    }

    const onCancel = () => {
        setState({ ...state, editing: false, editingID: "" })
        reset()
    }

    const onSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setState({ ...state, [e.target.id]: e.target.value })
    }

    const taskDelete = async (task: ITaskData) => {
        toast.promise(deleteTask(task.id), {
            pending: 'Deleting Task',
            success: `Task ${task.title} deleted successfully`,
        }).then(() => {
            setTasks(tasks.filter(t => t.id !== task.id))
        })
        setState({...state, deleteTask: null})
    }

    const taskEdit = async (task: ITaskData) => {
        setValue("title", task.title)
        setValue("description", task.description)
        setValue("subheading", task.subheading)
        // @ts-ignore
        setValue("dueDate", task.dueDate.toLocaleDateString('en-CA'))
        setValue("createRoom", task.createRoom)
        setValue("submissionLink", task.submissionLink)
        setValue("link", task.link)
        setValue("mentors", task.mentors.map(m => ({ value: m })))
        setValue("type", task.type)
        setValue("roomName", task.roomName)
        setValue("roles", task.roles.map(r => ({  value: r})))
        setValue("available", task.available)

        setState({ ...state, editing: true, editingID: task.id })
    }

    const taskAssign = (task: ITaskData) => {
        setAssignState({ input: "", emails: [] })
        setState({ ...state, assignTask: task })
    }

    const addAssignEmail = () => {
        assignState.input.split(/[ ,]+/).map(e => {
            if (assignState.emails.some(f => f === e)) return
            if (!/^\S+@\S+\.\S+$/.test(e)) return
            assignState.emails.push(e)
            setAssignState({ input: "", emails: assignState.emails });
        })
    };

    const _assignTask = async () => {
        if (!state.assignTask) return
        const task = state.assignTask
        if (assignState.emails.length === 0) return toast.error('No users added!')
        setState({...state, assignTask: null})
        const memberSnapshot = await getUserEmailIn(assignState.emails)
        const members = memberSnapshot.docs.map(d => d.data() as IUser)
        const promise = assignTask(task, members)
        
        let notfound = ""
        if (assignState.emails.length !== members.length) notfound = ` (${assignState.emails.length - members.length} users not found)`
        await toast.promise(promise, {
            pending: `Assigning tasks to ${members.length} users${notfound}`,
            success: `Assigned tasks to ${members.length} users${notfound}`,
            error: `An error occured. Contact Zine team`
        })
    }

    useEffect(() => {
        fetchTasks().then(res => {
            console.log(res)
            const tasks = res.map(d => {
                const { dueDate, ...data } = d
                return { id: d.id, dueDate: new Date(dueDate), ...data } as ITaskData
            })
            console.log(tasks)
            setTasks(() => tasks)
        })
        fetchRoles().then(res => {
            const roles = res.docs.map(d => {
                const { ...data } = d.data()
                return { id: d.id, ...data } as IRoleData
            })
            console.log("roles: ",roles)
            setRoles(() => roles)
        })
    }, [])

    return (
        <ProtectedRoute>
            <ToastContainer
                position="top-left"
                autoClose={5000}
                hideProgressBar
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="light"
            />

            <div className="grid grid-cols-12 h-screen" style={{ background: "#EFEFEF" }}>
                <div className="col-span-12 px-6 md:px-12 flex flex-col overflow-y-scroll md:col-span-9">
                    <h1 className="text-4xl font-bold mt-16 md:mt-8" style={{ color: "#AAAAAA" }}>Tasks</h1>
                    <div className="row-span-5 bg-white rounded-xl py-4 px-6 my-8 w-full shadow-md">
                        <h1 className="text-2xl font-bold" style={styles.textPrimary}>{state.editing ? "Edit Task" : "Create Task"}</h1>
                        <form>
                            <div className="grid grid-cols-5 gap-6 mt-4">
                                <div className="col-span-3">
                                    <label className="block text-gray-600 text-sm">Task Name<span className="text-red-500">*</span></label>
                                    <input type="text" id="name" className="block w-full focus:outline-none bottom-border pt-2 px-1" {...register('title', { required: true })} />
                                    {errors.title && <p className="text-red-500 text-sm" role="alert">Title is required</p>}
                                </div>
                                <div className="col-span-3">
                                    <label className="block text-gray-600 text-sm">Task Subheading<span className="text-red-500">*</span></label>
                                    <input type="text" id="name" className="block w-full focus:outline-none bottom-border pt-2 px-1" {...register('subheading', { required: true })} />
                                    {errors.subheading && <p className="text-red-500 text-sm" role="alert">Subheading is required</p>}
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-gray-600 text-sm">Type<span className="text-red-500">*</span></label>
                                    <select id="type" className="block w-full focus:outline-none bottom-border pt-2 px-1" {...register('type')}>
                                        <option>Individual</option>
                                        <option>Team</option>
                                    </select>
                                </div>
                                <div className="col-span-5">
                                    <label className="block text-gray-600 text-sm">Task Description<span className="text-red-500">*</span></label>
                                    <textarea id="description" className="block w-full focus:outline-none bottom-border pt-2 px-1" rows={1} {...register('description', { required: true })}></textarea>
                                    {errors.description && <p className="text-red-500 text-sm" role="alert">Title is required</p>}
                                </div>
                                <div className="col-span-3">
                                    <label className="block text-gray-600 text-sm">Mentor Email IDs (upto 30, comma seperated)<span className="text-red-500">*</span></label>
                                    <EmailListInput control={control} />
                                    {/* <input type="text" id="mentors" className="block w-full focus:outline-none bottom-border pt-2 px-1" placeholder="2021ucp1011@mnit.ac.in, 2021ucp1013@mnit.ac.in" {...register('mentors', {required: true})} /> */}
                                    {errors.mentors && <p className="text-red-500 text-sm" role="alert">Mentors list is required</p>}
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-gray-600 text-sm">Submission Link</label>
                                    <input type="text" id="submissionlink" className="block w-full focus:outline-none bottom-border pt-2" {...register('submissionLink')} />
                                </div>
                                <div className="col-span-3">
                                    <label className="block text-gray-600 text-sm">Roles <span className="text-red-500">*</span></label>
                                    <RoleListInput control={control} roles={roles}/>
                                    {/* <input type="text" id="mentors" className="block w-full focus:outline-none bottom-border pt-2 px-1" placeholder="2021ucp1011@mnit.ac.in, 2021ucp1013@mnit.ac.in" {...register('mentors', {required: true})} /> */}
                                    {errors.roles && <p className="text-red-500 text-sm" role="alert">Role list is required</p>}
                                </div>
                                <div className="col-span-2 flex items-center">
                                    <input type="checkbox" {...register('available')}></input>
                                    <label className="ml-8">Available for selection</label>
                                </div>
                                <div className="col-span-3">
                                    <label className="block text-gray-600 text-sm">Due Date<span className="text-red-500">*</span></label>
                                    <input type="date" id="dueDate" className="block w-full focus:outline-none bottom-border pt-2" {...register('dueDate', { required: true, valueAsDate: true })} />
                                    {errors.dueDate && <p className="text-red-500 text-sm" role="alert">Due Date is required</p>}
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-gray-600 text-sm">PS Link<span className="text-red-500">*</span></label>
                                    <input type="text" id="link" className="block w-full focus:outline-none bottom-border pt-2 px-1" {...register('link', { required: true })} />
                                    {errors.link && <p className="text-red-500 text-sm" role="alert">Link is required</p>}
                                </div>
                                <div className="col-span-2 flex items-center">
                                    <input type="checkbox" {...register('createRoom')}></input>
                                    <label className="ml-8">Automatically Create Room?</label>
                                </div>
                                {
                                    watchCreateRoom === true && <div className="col-span-3">
                                        <label className="block text-gray-600 text-sm">Default Room Name (Optional)</label>
                                        <input type="text" className="block w-full focus:outline-none bottom-border pt-2" {...register('roomName', { required: false })} />
                                    </div>
                                }
                                {
                                    watchCreateRoom === false && <div className="col-span-3">
                                        <label className="block text-gray-600 text-sm">Existing Room Name<span className="text-red-500">*</span></label>
                                        <input type="text" className="block w-full focus:outline-none bottom-border pt-2" {...register('roomName', { required: true })} />
                                        {errors.roomName && <p className="text-red-500 text-sm" role="alert">Existing room name is required</p>}
                                    </div>
                                }
                            </div>
                            {
                                !state.editing ?
                                    <button className="p-3 block w-40 rounded-3xl text-white mt-8" style={{ background: "#0C72B0" }} onClick={handleSubmit(onSubmit)}>Create</button> :
                                    <div className="text-white mt-8 flex gap-2">
                                        <button className="p-3 block w-40 rounded-3xl" style={{ background: "#0C72B0" }} onClick={handleSubmit(onEdit)}>Edit</button>
                                        <button className="p-3 block w-40 rounded-3xl bg-red-500" onClick={() => onCancel()}>Cancel</button>
                                    </div>
                            }
                        </form>
                    </div>

                    <div className="bg-white py-4 px-6 mb-8 rounded-xl shadow-md">
                        <div className="grid grid-cols-6 gap-4">
                            <div className="col-span-4 flex flex-col">
                                <label className="text-gray-500">Search</label>
                                <input id="search" type="text" className="pt-2 bottom-border focus:outline-none" onChange={onSearchChange} placeholder="Search email ID or name" value={state?.search} autoComplete="off" />
                            </div>

                            {/* <button className="p-2 mt-4 text-white rounded-xl" style={{background: "#0C72B0"}}>Search</button> */}
                        </div>

                        <table className="table-auto w-full mt-8 text-center">
                            <thead>
                                <tr className="text-left">
                                    <th className="border p-1">S.No</th>
                                    <th className="border p-1">Title</th>
                                    <th className="border p-1">Type</th>
                                    <th className="border p-1">Due Date</th>
                                    <th className="border p-1">Mentors</th>
                                    <th className="border p-1">PS Link</th>
                                    <th className="border p-1">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {
                                    tasks
                                        .filter(u => !state.search || u.title.toLowerCase().includes(state.search!.toLowerCase()) || u.subheading?.toLowerCase().includes(state.search!.toLowerCase()))
                                        .map((u, index) => (
                                            <tr key={u.title} className="text-left border-black text-sm">
                                                <td className="border p-1 text-center">{index + 1}</td>
                                                <td className="border p-1">{u.title}</td>
                                                <td className="border p-1">{u.type}</td>
                                                <td className="border p-1">{u.dueDate.toDateString()}</td>
                                                {/* <td className="border p-1 text-center">{u.mentors.length}</td */}
                                                <td className="border p-1 text-blue-500 overflow-hidden text-center"><a href={u.link} target="_blank">Link</a></td>
                                                <td className="border p-1">
                                                    <button className="bg-yellow-500 text-white py-1 px-2 rounded-lg" onClick={() => taskEdit(u)}>Edit</button>
                                                    <button className="bg-red-500 text-white py-1 px-2 rounded-lg ml-1" onClick={() => setState({...state, deleteTask: u})}>Delete</button>
                                                    <button className="bg-green-500 text-white py-1 px-2 rounded-lg ml-1" onClick={() => taskAssign(u)}>Assign</button>
                                                </td>
                                            </tr>
                                        ))
                                }
                            </tbody>
                        </table>
                        {!tasks.length && <p className="text-center text-xl mt-4">No results found</p>}
                    </div>
                </div>
                <SideNav />
            </div>

            {/* Confirm delete modal */}
            <Modal isOpen={state.deleteTask !== null} onClose={() => setState({...state, deleteTask: null})}>
                <div className="p-4 md:p-5 text-center">
                    <svg className="mx-auto mb-4 text-gray-400 w-12 h-12 dark:text-gray-200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
                        <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 11V6m0 8h.01M19 10a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                    </svg>
                    <h3 className="mb-5 text-lg font-normal text-gray-500">Are you sure you want to delete {state.deleteTask?.title} task?</h3>
                    <button type="button" className="text-white bg-red-600 hover:bg-red-800 font-medium rounded-lg text-sm inline-flex items-center px-5 py-2.5 text-center me-2" onClick={() => taskDelete(state.deleteTask!)}>
                        Delete
                    </button>
                    <button type="button" className="text-gray-500 bg-white hover:bg-gray-100 rounded-lg border ml-2 border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900" onClick={() => setState({...state, deleteTask: null})}>Cancel</button>
                </div>
            </Modal>

            {/* Assign Task Modal */}
            <Modal isOpen={state.assignTask !== null} onClose={() => setState({...state, assignTask: null})}>
                <div className="p-4 md:p-5 text-center">
                    <h3 className="mb-2 text-lg font-bold text-gray-500">Assign Task {state.assignTask?.title}</h3>
                    <div className="flex text-sm">
                        <input type='text' className="block w-full focus:outline-none bottom-border pt-2 px-1" value={assignState.input} onChange={(e) => setAssignState({...assignState, input: e.target.value})} />
                        <button type="button" className="text-white rounded-md ml-2 px-2 py-1" style={{ background: "#0C72B0" }} onClick={addAssignEmail}>Add</button>
                    </div>

                    <div className="grid grid-cols-2 text-sm font-medium mt-2 gap-1">
                        {assignState.emails.map((field, index) => (
                            <div key={field} className="flex py-1 px-2 rounded-3xl" style={{background: "#C2FFF48A", color: "#0C72B0F2"}}>
                                <input className="font-medium" disabled value={field} />
                                <button className="ml-1" type="button" onClick={() => setAssignState({...assignState, emails: assignState.emails.filter(t => t !== field)})}>✕</button>
                            </div>
                        ))}
                    </div>

                    <div className="flex mt-4 justify-center text-white text-sm gap-2">
                        <button type="button" className="p-2 block w-40 rounded-3xl" style={{ background: "#0C72B0" }} onClick={() => _assignTask()}>
                            Assign Tasks
                        </button>
                        <button type="button" className="p-2 block w-40 rounded-3xl text-red-500 border" onClick={() => setState({...state, assignTask: null})}>
                            Cancel
                        </button>
                    </div>
                </div>
            </Modal>

        </ProtectedRoute>
    )
}

export default Tasks;