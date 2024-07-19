import { useEffect, useState } from "react";
import SideNav from "../sidenav";
import styles from "../../../constants/styles";
import ProtectedRoute from "./ProtectedRoute";
import { collection, doc, getDoc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import Checkpoints from "../checkpoints";
import Comments from "../comments";
import Modal from "../modal";
import { ICheckPoint, IProject, IUserProject, deleteProject } from "../../../apis/projects";
import { ITaskData, fetchTasks } from "../../../apis/tasks";
import { ToastContainer, toast } from "react-toastify";
import { IUser } from "../../../apis/users";

function sortTimestamps(a: ICheckPoint[], b: ICheckPoint[]) {
  // console.log("A", a?.length, "B", b?.length);

  return a?.length || b?.length ? (!a?.length ? -1 : !b?.length ? 1 : a?.slice(-1)[0].timeDate.seconds - b.slice(-1)[0].timeDate.seconds) : 0;
}

const Projects = () => {
  const [projects, setProjects] = useState<IProject[]>([]);
  const [userProject, setUserProject] = useState<IProject>();
  const [state, setState] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const userTasksCollection = collection(db, "userTasks");
  const onSearchChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setState(e.target.value);
  };

  const onStatusChange = (status: string) => {
    if (!userProject) return;
    updateDoc(doc(db, "userTasks", userProject.id), {
      status: status,
    }).then(() => {
      setUserProject({ ...userProject });
    });
  };

  const deleteUserProject = async () => {
    if (!userProject) return;
    setConfirmDelete(false);
    await toast.promise(deleteProject(userProject), {
      pending: "Deleting project",
      success: "Project deleted successfully",
      error: "An error occurred. Contact Zine team",
    });
    setUserProject(undefined);
  };

  useEffect(() => {
    fetchTasks()
      .then((snapshots) => {
        const tasks: { [key: string]: ITaskData } = {};
        snapshots.forEach((d: any) => {
          tasks[d.id] = d.data() as ITaskData;
        });
        return tasks;
      })
      .then((tasks) => {
        console.log(tasks);
        getDocs(userTasksCollection).then((snapshots) => {
          snapshots.forEach(async (d) => {
            const userProject = d.data() as IUserProject;
            const puser = await getDoc(userProject.users[0]);
            const { name, email, type, uid } = puser.data() as IUser;
            const project = {
              ...userProject,
              usersData: [{ name, email, type, uid, roomids: [] }],
              taskData: tasks[userProject.task?.id],
              id: d.id,
              comments: userProject.comments,
              links: userProject.links,
            };

            setProjects((state) => [...state, project]);
            if (!project.task) console.log(project.usersData[0].email, project.id);
          });
        });
      });
  }, []);

  return (
    <ProtectedRoute>
      <ToastContainer position="top-left" autoClose={5000} hideProgressBar newestOnTop={false} closeOnClick rtl={false} pauseOnFocusLoss draggable pauseOnHover theme="light" />

      <div className="grid grid-cols-12 h-screen" style={{ background: "#EFEFEF" }}>
        <div className="col-span-12 md:col-span-9 px-6 md:px-12 flex flex-col overflow-y-scroll">
          <h1 className="text-4xl font-bold mt-8" style={{ color: "#AAAAAA" }}>
            Projects
          </h1>

          {!userProject && (
            <div className="my-8">
              <div className="flex flex-col">
                <label className="text-gray-500">Search</label>
                <input id="search" type="text" className="text-lg p-2 bottom-border" onChange={onSearchChange} placeholder="Search email ID or name or project or status" value={state} />
              </div>
              <div className="grid grid-cols-1 text-center md:grid-cols-3 gap-6 mt-2">
                {projects
                  .filter(
                    (p) =>
                      !state ||
                      p.usersData[0].name.toLowerCase().includes(state.toLowerCase()) ||
                      p.usersData[0].email.includes(state.toLowerCase()) ||
                      p.taskData.title.toLowerCase().includes(state.toLowerCase()) ||
                      p.status.toLowerCase().includes(state.toLowerCase())
                  )
                  .sort((a, b) => sortTimestamps(b.checkpoints, a.checkpoints))
                  .map((p) => (
                    <div key={p.id} className="bg-white rounded-xl flex flex-col justify-center py-2 cursor-pointer" onClick={() => setUserProject(p)}>
                      <div className="mt-4 p-3 text-white font-extrabold text-3xl" style={{ background: "#0C72B0" }}>
                        <p>{p.taskData?.title}</p>
                      </div>

                      <h2 className="my-4 text-5xl font-extrabold" style={styles.textPrimary}>
                        {p.checkpoints?.length}
                      </h2>
                      <h3 className="mt-4 text-2xl font-bold" style={{ color: "#95C5E2" }}>
                        {p.usersData[0].name}
                      </h3>
                      <p className="mt-1 mb-4 text-lg font-bold" style={styles.textGray}>
                        {p.usersData[0].email}
                      </p>
                      <div className="my-4 p-2 text-white font-bold text-xl" style={{ background: "#0C72B0" }}>
                        <p>{p.status}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          {userProject && (
            <>
              <Checkpoints projectData={userProject} />
              <div className="flex justify-between text-white my-2 gap-2 text-sm md:text-normal">
                <button className="bg-white text-gray-500 border hover:bg-gray-100 py-2 px-5 rounded-xl shadow-md" onClick={() => setUserProject(undefined)}>
                  Back
                </button>
                <button className="bg-red-500 py-2 px-5 rounded-xl font-bold shadow-md" onClick={() => setConfirmDelete(true)}>
                  Delete Project
                </button>
                <select className="rounded-xl py-2 px-5 text-center font-bold shadow-md" value={userProject.status} onChange={(e) => onStatusChange(e.target.value)} style={{ background: "#0C72B0" }}>
                  <option>Assigned</option>
                  <option>Stage 1</option>
                  <option>Stage 2</option>
                  <option>Stage 3</option>
                  <option>Setup</option>
                  <option>In Review</option>
                  <option>Finished</option>
                </select>
              </div>
              <Comments projectData={userProject} />
            </>
          )}
        </div>
        <SideNav />
      </div>

      <Modal isOpen={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <div className="p-4 md:p-5 text-center">
          <svg className="mx-auto mb-4 text-gray-400 w-12 h-12 dark:text-gray-200" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 11V6m0 8h.01M19 10a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <h3 className="mb-5 text-lg font-normal text-gray-500">Are you sure you want to delete this project?</h3>
          <button
            type="button"
            className="text-white bg-red-600 hover:bg-red-800 font-medium rounded-lg text-sm inline-flex items-center px-5 py-2.5 text-center me-2"
            onClick={() => deleteUserProject()}
          >
            Delete
          </button>
          <button
            type="button"
            className="text-gray-500 bg-white hover:bg-gray-100 rounded-lg border ml-2 border-gray-200 text-sm font-medium px-5 py-2.5 hover:text-gray-900"
            onClick={() => setConfirmDelete(false)}
          >
            Cancel
          </button>
        </div>
      </Modal>
    </ProtectedRoute>
  );
};

export default Projects;
