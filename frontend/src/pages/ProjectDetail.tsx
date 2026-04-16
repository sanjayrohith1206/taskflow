import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { 
  Plus, Search, Filter, Calendar, 
  CheckCircle2, Circle, Clock, 
  AlertCircle, MoreVertical, Trash2, Edit2,
  GripVertical, List, Layout as LayoutIcon,
  ChevronDown, ChevronUp, ChevronLeft, ChevronRight
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
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<string>('position');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const [totalTasks, setTotalTasks] = useState(0);
  const [pageSize, setPageSize] = useState(10);
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
  }, [id, filterStatus, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filterStatus, searchQuery]);

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
      const data = await api.get(`/projects/${id}?status=${filterStatus}&page=${page}&limit=${pageSize}`);
      setProject({ ...data.project, tasks: data.tasks });
      setTotalTasks(data.total_tasks);
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
    if (destination.index === source.index) return;

    const originalTasks = [...(project?.tasks || [])];
    const reorderedTasks = Array.from(filteredAndSortedTasks);
    const [movedTask] = reorderedTasks.splice(source.index, 1);
    reorderedTasks.splice(destination.index, 0, movedTask);

    // Optimistic Update
    setProject(prev => {
      if (!prev) return null;
      // We update the positions in the local state for all involved tasks if needed, 
      // but for simplicity we'll just update the moved task's position and rely on the next fetch
      // or a more sophisticated local sort.
      const updatedTasks = prev.tasks.map(t => {
        if (t.id === draggableId) {
          return { ...t, position: destination.index };
        }
        return t;
      });
      return { ...prev, tasks: updatedTasks };
    });

    try {
      await api.patch(`/tasks/${draggableId}`, { 
        position: destination.index
      });
      // Optionally re-fetch to ensure backend state consistency
      fetchProject();
    } catch (err) {
      setProject(prev => prev ? { ...prev, tasks: originalTasks } : null);
    }
  };

  const filteredAndSortedTasks = (project?.tasks || [])
    .filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const fieldA = (a as any)[sortField];
      const fieldB = (b as any)[sortField];
      if (fieldA < fieldB) return sortDirection === 'asc' ? -1 : 1;
      if (fieldA > fieldB) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
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

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await api.delete(`/tasks/${taskId}`);
        fetchProject();
      } catch (err) {
        console.error('Failed to delete task', err);
      }
    }
  };

  const handleTaskAction = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...taskForm,
      assignee_id: taskForm.assignee_id || null,
      due_date: taskForm.due_date || null
    };

    try {
      if (editingTask) {
        await api.patch(`/tasks/${editingTask.id}`, payload);
      } else {
        await api.post(`/projects/${id}/tasks`, payload);
      }
      setShowTaskModal(false);
      setTaskForm({
        title: '',
        description: '',
        status: 'todo',
        priority: 'medium',
        assignee_id: '',
        due_date: ''
      });
      fetchProject();
    } catch (err) {
      console.error('Failed to perform task action', err);
    }
  };

  if (loading) return <div className="flex-center" style={{ height: '60vh' }}><div className="loader" /></div>;
  if (!project) return null;

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />;
  };

  return (
    <div className="container" style={{ paddingBottom: '5rem' }}>
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
              <h1 style={{ fontSize: '2.5rem' }}>{project.name}</h1>
            </div>
            <p style={{ maxWidth: '700px', color: 'var(--text-secondary)' }}>{project.description}</p>
          </div>
          <button className="btn btn-primary" onClick={() => { setEditingTask(null); setShowTaskModal(true); }}>
            <Plus size={20} />
            Add Task
          </button>
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search tasks by title..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                outline: 'none',
                transition: 'all 0.2s ease',
              }}
              onFocus={(e) => e.target.style.borderColor = 'var(--brand-primary)'}
              onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto' }}>
            <Filter size={16} style={{ color: 'var(--text-muted)' }} />
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: '0.625rem 1rem',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="">All Statuses</option>
              <option value="todo">To Do</option>
              <option value="in_progress">In Progress</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="task-list">
          {(provided) => (
            <div 
              className="list-container"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              <div className="list-header">
                <div /> {/* Drag Handle Spacer */}
                <div style={{ paddingLeft: '0px' }}>Task Title</div>
                <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: '11px' }} onClick={() => handleSort('status')}>
                  Status {renderSortIcon('status')}
                </div>
                <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', paddingLeft: '18px' }} onClick={() => handleSort('priority')}>
                  Priority {renderSortIcon('priority')}
                </div>
                <div style={{ paddingLeft: '32px' }}>Assignee</div>
                <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }} onClick={() => handleSort('due_date')}>
                  Due Date {renderSortIcon('due_date')}
                </div>
                <div style={{ textAlign: 'right' }}>Actions</div>
              </div>

              {filteredAndSortedTasks.length === 0 ? (
                <div className="flex-center" style={{ padding: '4rem', flexDirection: 'column', gap: '1rem', color: 'var(--text-muted)' }}>
                  <Search size={40} opacity={0.2} />
                  <p>No tasks found matching your criteria</p>
                </div>
              ) : (
                filteredAndSortedTasks.map((task, index) => (
                  <Draggable key={task.id} draggableId={task.id} index={index}>
                    {(provided, snapshot) => (
                      <div 
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`list-row ${snapshot.isDragging ? 'dragging' : ''}`}
                        onClick={() => openEditModal(task)}
                        style={{
                          ...provided.style,
                          background: snapshot.isDragging ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                          boxShadow: snapshot.isDragging ? 'var(--shadow-lg)' : 'none',
                          border: snapshot.isDragging ? '1px solid var(--brand-primary)' : '1px solid transparent',
                          borderRadius: snapshot.isDragging ? 'var(--radius-md)' : '0'
                        }}
                      >
                        <div {...provided.dragHandleProps} style={{ padding: '0 10px', color: 'var(--text-muted)', cursor: 'grab' }}>
                          <GripVertical size={18} />
                        </div>
                        <div style={{ fontWeight: 500 }}>{task.title}</div>
                        <div>
                          <span className={`badge ${task.status === 'in_progress' ? 'badge-primary' : ''}`}>
                            {task.status.replace('_', ' ')}
                          </span>
                        </div>
                        <div>
                          <span style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '0.4rem', 
                            fontSize: '0.8rem',
                            color: `var(--priority-${task.priority})`,
                            fontWeight: 600
                          }}>
                            <Circle size={8} fill="currentColor" />
                            {task.priority.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          {task.assignee_name ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <div className="flex-center" style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--brand-glow)', color: 'var(--brand-primary)', fontSize: '0.7rem', fontWeight: 600 }}>
                                {task.assignee_name.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontSize: '0.9rem' }}>{task.assignee_name}</span>
                            </div>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Unassigned</span>
                          )}
                        </div>
                        <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                          {task.due_date ? format(new Date(task.due_date), 'MMM d, yyyy') : '-'}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.25rem' }} onClick={(e) => e.stopPropagation()}>
                          <button className="btn btn-ghost" style={{ padding: '0.4rem' }} onClick={() => openEditModal(task)}>
                            <Edit2 size={16} />
                          </button>
                          <button className="btn btn-ghost" style={{ padding: '0.4rem', color: 'var(--danger)' }} onClick={() => handleDeleteTask(task.id)}>
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))
              )}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Pagination UI */}
      {totalTasks > 0 && (
        <div className="pagination-bar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Showing <strong style={{ color: 'var(--text-primary)' }}>{(page - 1) * pageSize + 1}</strong> 
              &nbsp;to <strong style={{ color: 'var(--text-primary)' }}>{Math.min(page * pageSize, totalTasks)}</strong> 
              &nbsp;of <strong style={{ color: 'var(--text-primary)' }}>{totalTasks}</strong> tasks
            </div>
            <div style={{ width: '1px', height: '24px', background: 'var(--border-subtle)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Show:</span>
              <select 
                className="pagination-select"
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
          
          <div className="pagination-controls">
            <button 
              className="pagination-btn" 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={18} />
            </button>

            {/* Simple page numbers */}
            {Array.from({ length: Math.ceil(totalTasks / pageSize) }).map((_, i) => {
              const pageNum = i + 1;
              const isCurrent = page === pageNum;
              return (
                <button
                  key={pageNum}
                  className={`pagination-btn ${isCurrent ? 'active' : ''}`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}

            <button 
              className="pagination-btn" 
              onClick={() => setPage(p => p + 1)}
              disabled={page * pageSize >= totalTasks}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

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
