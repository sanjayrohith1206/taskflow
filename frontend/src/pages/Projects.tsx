import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Plus, Folder, Calendar, ChevronRight, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';

interface Project {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

const Projects: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const data = await api.get('/projects');
      setProjects(data.projects || []);
    } catch (err) {
      console.error('Failed to fetch projects', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/projects', newProject);
      setShowModal(false);
      setNewProject({ name: '', description: '' });
      fetchProjects();
    } catch (err) {
      console.error('Failed to create project', err);
    }
  };

  if (loading) return <div className="flex-center" style={{ height: '60vh' }}><div className="loader" /></div>;

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Projects</h1>
          <p>Manage your workspaces and team collaborations</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={20} />
          Create Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="glass-card flex-center" style={{ padding: '5rem', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="flex-center" style={{ width: '64px', height: '64px', background: 'var(--bg-secondary)', borderRadius: '50%', color: 'var(--text-muted)' }}>
            <Folder size={32} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h3>No projects found</h3>
            <p>Get started by creating your first project workspace.</p>
          </div>
        </div>
      ) : (
        <div className="grid-auto">
          {projects.map((project) => (
            <Link key={project.id} to={`/projects/${project.id}`}>
              <div className="glass-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div className="flex-center" style={{ width: '40px', height: '40px', background: 'var(--bg-secondary)', borderRadius: '10px', color: 'var(--brand-primary)' }}>
                    <Folder size={20} />
                  </div>
                  <button className="btn btn-ghost" style={{ padding: '0.25rem' }}>
                    <MoreVertical size={18} />
                  </button>
                </div>
                
                <h3 style={{ marginBottom: '0.5rem', fontSize: '1.25rem' }}>{project.name}</h3>
                <p style={{ 
                  fontSize: '0.9rem', 
                  marginBottom: '1.5rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  height: '2.7rem'
                }}>
                  {project.description || 'No description provided.'}
                </p>
                
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  paddingTop: '1rem',
                  borderTop: '1px solid var(--border-subtle)',
                  fontSize: '0.8rem',
                  color: 'var(--text-muted)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Calendar size={14} />
                    {format(new Date(project.created_at), 'MMM d, yyyy')}
                  </div>
                  <ChevronRight size={16} />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="flex-center" style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.4)',
          backdropFilter: 'blur(4px)',
          zIndex: 1000
        }}>
          <div className="glass-card" style={{ width: '90%', maxWidth: '500px', border: 'none', boxShadow: 'var(--shadow-lg)' }}>
            <h2 style={{ marginBottom: '1.5rem' }}>New Project</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Project Name</label>
                <input 
                  type="text" 
                  value={newProject.name}
                  onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
                  required
                  placeholder="e.g. Website Redesign"
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
                  value={newProject.description}
                  onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                  placeholder="What is this project about?"
                  rows={4}
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
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={!newProject.name}>Create Project</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
