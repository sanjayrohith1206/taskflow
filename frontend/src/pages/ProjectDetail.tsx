import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
  Plus, Search, Filter, Calendar, 
  CheckCircle2, Circle, Clock, 
  AlertCircle, MoreVertical, Trash2, Edit2,
  GripVertical
} from 'lucide-react';
import { format } from 'date-fns';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { useWebSocket } from '../hooks/useWebSocket';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'medium' | 'high';
  assignee_id?: string;
  assignee_name?: string;
  position: number;
  due_date: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  tasks: Task[];
}

const ProjectDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    status: 'todo',
    priority: 'medium',
    assignee_id: '',
    due_date: ''
  });

  useEffect(() => {
    fetchProject();
    fetchUsers();
  }, [id, filterStatus]);

  const fetchUsers = async () => {
    try {
      const data = await api.get('/users');
      setUsers(data.users || []);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  };

  const fetchProject = async () => {
    try {
      const data = await api.get(`/projects/${id}?status=${filterStatus}`);
      setProject(data);
    } catch (err) {
      console.error('Failed to fetch project', err);
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  useWebSocket(id, (event) => {
    if (event.type === 'TASK_CREATED' || event.type === 'TASK_UPDATED' || event.type === 'TASK_DELETED') {
        fetchProject();
    }
  });

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    const task = project?.tasks.find(t => t.id === draggableId);
    if (!task) return;

    const newStatus = destination.droppableId as Task['status'];
    const originalTasks = [...(project?.tasks || [])];

    // Optimistic Update
    setProject(prev => {
      if (!prev) return null;
      const updatedTasks = prev.tasks.map(t => 
        t.id === draggableId ? { ...t, status: newStatus, position: destination.index } : t
      );
      return { ...prev, tasks: updatedTasks };
    });

    try {
      await api.patch(`/tasks/${draggableId}`, { 
        status: newStatus,
        position: destination.index
      });
    } catch (err) {
      setProject(prev => prev ? { ...prev, tasks: originalTasks } : null);
    }
  };

  const tasksByStatus = {
    todo: project?.tasks?.filter(t => t.status === 'todo').sort((a, b) => a.position - b.position) || [],
    in_progress: project?.tasks?.filter(t => t.status === 'in_progress').sort((a, b) => a.position - b.position) || [],
    done: project?.tasks?.filter(t => t.status === 'done').sort((a, b) => a.position - b.position) || []
  };

  const handleTaskAction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingTask) {
        await api.patch(`/tasks/${editingTask.id}`, taskForm);
      } else {
        await api.post(`/projects/${id}/tasks`, taskForm);
      }
      setShowTaskModal(false);
      setEditingTask(null);
      setTaskForm({ title: '', description: '', status: 'todo', priority: 'medium', assignee_id: '', due_date: '' });
      fetchProject();
    } catch (err) {
      console.error('Failed to save task', err);
    }
  };

  const handleStatusChange = async (task: Task, newStatus: string) => {
    // Optimistic UI
    const originalTasks = [...(project?.tasks || [])];
    setProject(prev => prev ? {
      ...prev,
      tasks: prev.tasks.map(t => t.id === task.id ? { ...t, status: newStatus as any } : t)
    } : null);

    try {
      await api.patch(`/tasks/${task.id}`, { status: newStatus });
    } catch (err) {
      // Revert on error
      setProject(prev => prev ? { ...prev, tasks: originalTasks } : null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      fetchProject();
    } catch (err) {
      console.error('Failed to delete task', err);
    }
  };

  const openEditModal = (task: Task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      assignee_id: task.assignee_id || '',
      due_date: task.due_date ? task.due_date.split('T')[0] : ''
    });
    setShowTaskModal(true);
  };

  if (loading) return <div className="flex-center" style={{ height: '60vh' }}><div className="loader" /></div>;
  if (!project) return null;

  return (
    <div className="container" style={{ paddingBottom: '5rem' }}>
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>{project.name}</h1>
            <p style={{ maxWidth: '700px' }}>{project.description}</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditingTask(null); setShowTaskModal(true); }}>
            <Plus size={20} />
            Add Task
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search tasks..." 
              style={{
                width: '100%',
                padding: '0.625rem 0.625rem 0.625rem 2.5rem',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--bg-tertiary)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                outline: 'none'
              }}
            />
          </div>
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '0.625rem 1rem',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--bg-tertiary)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              outline: 'none'
            }}
          >
            <option value="">All Statuses</option>
            <option value="todo">To Do</option>
            <option value="in_progress">In Progress</option>
            <option value="done">Done</option>
          </select>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', alignItems: 'flex-start' }}>
          {(['todo', 'in_progress', 'done'] as const).map((status) => (
            <div key={status} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <h3 style={{ fontSize: '1.1rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                  {status.replace('_', ' ')}
                </h3>
                <span style={{ fontSize: '0.8rem', padding: '2px 8px', borderRadius: '10px', background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                  {tasksByStatus[status].length}
                </span>
              </div>

              <Droppable droppableId={status}>
                {(provided, snapshot) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    style={{
                      minHeight: '500px',
                      background: snapshot.isDraggingOver ? 'var(--bg-secondary)' : 'transparent',
                      borderRadius: 'var(--radius-lg)',
                      transition: 'background-color 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem'
                    }}
                  >
                    {tasksByStatus[status].map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="glass-card"
                            style={{ 
                              ...provided.style,
                              display: 'flex', 
                              flexDirection: 'column',
                              gap: '1rem',
                              padding: '1.25rem',
                              opacity: snapshot.isDragging ? 0.8 : 1,
                              border: snapshot.isDragging ? '1px solid var(--brand-primary)' : '1px solid var(--bg-tertiary)'
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div {...provided.dragHandleProps} style={{ color: 'var(--text-muted)', cursor: 'grab' }}>
                                <GripVertical size={16} />
                              </div>
                              <span style={{ 
                                fontSize: '0.65rem', 
                                padding: '2px 6px', 
                                borderRadius: '4px',
                                background: `rgba(var(--priority-${task.priority}), 0.1)`,
                                color: `var(--priority-${task.priority})`,
                                border: `1px solid var(--priority-${task.priority})`,
                                textTransform: 'uppercase',
                                fontWeight: 700
                              }}>
                                {task.priority}
                              </span>
                            </div>

                            <div style={{ flex: 1 }}>
                              <h4 style={{ 
                                fontSize: '1rem', 
                                fontWeight: '600',
                                marginBottom: '0.5rem',
                                color: 'var(--text-primary)'
                              }}>
                                {task.title}
                              </h4>
                              {task.description && (
                                <p style={{ 
                                  fontSize: '0.85rem', 
                                  color: 'var(--text-secondary)',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden'
                                }}>
                                  {task.description}
                                </p>
                              )}
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                {task.assignee_name ? (
                                  <div className="flex-center" style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--brand-primary)', color: 'white', fontSize: '0.6rem' }} title={task.assignee_name}>
                                    {task.assignee_name.charAt(0).toUpperCase()}
                                  </div>
                                ) : (
                                  <div className="flex-center" style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                                    <Clock size={12} />
                                  </div>
                                )}
                              </div>

                              <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-ghost" style={{ padding: '0.25rem' }} onClick={() => openEditModal(task)}>
                                  <Edit2 size={14} />
                                </button>
                                <button className="btn btn-ghost" style={{ padding: '0.25rem', color: 'var(--danger)' }} onClick={() => handleDeleteTask(task.id)}>
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* Task Modal */}
      {showTaskModal && (
        <div className="flex-center" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000
        }}>
          <div className="glass-card" style={{ width: '90%', maxWidth: '500px', border: 'none', boxShadow: 'var(--shadow-lg)' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>{editingTask ? 'Edit Task' : 'Add New Task'}</h2>
            <form onSubmit={handleTaskAction} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Title</label>
                <input 
                  type="text" 
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                  required
                  placeholder="Task title"
                  style={{
                    padding: '0.75rem',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Status</label>
                  <select 
                    value={taskForm.status}
                    onChange={(e) => setTaskForm({ ...taskForm, status: e.target.value as any })}
                    style={{
                      padding: '0.75rem',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                  </select>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Priority</label>
                  <select 
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value as any })}
                    style={{
                      padding: '0.75rem',
                      background: 'var(--bg-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      color: 'var(--text-primary)',
                      outline: 'none'
                    }}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Assignee</label>
                <select 
                  value={taskForm.assignee_id}
                  onChange={(e) => setTaskForm({ ...taskForm, assignee_id: e.target.value })}
                  style={{
                    padding: '0.75rem',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                >
                  <option value="">Unassigned</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Due Date</label>
                <input 
                  type="date" 
                  value={taskForm.due_date}
                  onChange={(e) => setTaskForm({ ...taskForm, due_date: e.target.value })}
                  style={{
                    padding: '0.75rem',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    outline: 'none'
                  }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Description</label>
                <textarea 
                  value={taskForm.description}
                  onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                  placeholder="Task details..."
                  rows={3}
                  style={{
                    padding: '0.75rem',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--text-primary)',
                    outline: 'none',
                    resize: 'none'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!taskForm.title}>
                  {editingTask ? 'Update' : 'Create'} Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectDetail;
