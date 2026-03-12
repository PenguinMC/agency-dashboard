'use client';

import { useState } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Task, TaskStatus } from '@/lib/types';
import { useTasks } from '@/lib/store';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';

const COLUMNS: { status: TaskStatus; label: string; color: string }[] = [
  { status: 'backlog',     label: 'Backlog',      color: 'text-slate-400' },
  { status: 'todo',        label: 'To Do',        color: 'text-blue-400' },
  { status: 'in_progress', label: 'In Progress',  color: 'text-cyan-400' },
  { status: 'review',      label: 'Review',       color: 'text-violet-400' },
  { status: 'done',        label: 'Done',         color: 'text-green-400' },
];

interface Props {
  search: string;
  filterAgent: string;
  filterPriority: string;
}

export default function KanbanBoard({ search, filterAgent, filterPriority }: Props) {
  const { state, apiCreateTask, apiUpdateTask, apiMoveTask } = useTasks();
  const [modalOpen, setModalOpen] = useState(false);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [newTaskStatus, setNewTaskStatus] = useState<TaskStatus>('todo');

  const filteredTasks = state.tasks.filter((t) => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterAgent && t.agent_id !== filterAgent) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    return true;
  });

  function onDragEnd(result: DropResult) {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId as TaskStatus;
    const taskId = result.draggableId;
    apiMoveTask(taskId, newStatus);
  }

  function openNewTask(status: TaskStatus) {
    setEditTask(null);
    setNewTaskStatus(status);
    setModalOpen(true);
  }

  async function handleSave(data: Partial<Task>) {
    if (editTask) {
      await apiUpdateTask(editTask.id, data);
    } else {
      await apiCreateTask({ ...data, status: data.status ?? newTaskStatus });
    }
  }

  return (
    <>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="flex gap-3 h-full pb-4 overflow-x-auto">
          {COLUMNS.map(({ status, label, color }) => {
            const tasks = filteredTasks.filter((t) => t.status === status);
            return (
              <div key={status} className="flex flex-col w-72 shrink-0">
                {/* Column Header */}
                <div className="flex items-center justify-between px-1 mb-3">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold uppercase tracking-widest ${color}`}>
                      {label}
                    </span>
                    <span className="text-[11px] text-slate-600 font-medium tabular-nums">
                      {tasks.length}
                    </span>
                  </div>
                  <button
                    onClick={() => openNewTask(status)}
                    className="w-5 h-5 flex items-center justify-center rounded-md hover:bg-white/10 text-slate-600 hover:text-slate-300 transition-colors"
                    title={`Add task to ${label}`}
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </button>
                </div>

                {/* Drop Zone */}
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={`flex-1 rounded-xl min-h-[100px] space-y-2 p-2 transition-colors duration-150 ${
                        snapshot.isDraggingOver
                          ? 'bg-white/[0.04] ring-1 ring-white/10'
                          : 'bg-white/[0.01]'
                      }`}
                    >
                      {tasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`transition-all duration-150 ${
                                snapshot.isDragging
                                  ? 'opacity-80 rotate-1 scale-[1.02] shadow-2xl shadow-black/50'
                                  : ''
                              }`}
                            >
                              <TaskCard
                                task={task}
                                onClick={() => {
                                  setEditTask(task);
                                  setModalOpen(true);
                                }}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}

                      {tasks.length === 0 && !snapshot.isDraggingOver && (
                        <button
                          onClick={() => openNewTask(status)}
                          className="w-full py-4 border border-dashed border-white/8 rounded-xl text-xs text-slate-600 hover:text-slate-500 hover:border-white/15 transition-colors"
                        >
                          + Add task
                        </button>
                      )}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {modalOpen && (
        <TaskModal
          task={editTask}
          agents={state.agents}
          onSave={handleSave}
          onClose={() => { setModalOpen(false); setEditTask(null); }}
        />
      )}
    </>
  );
}
