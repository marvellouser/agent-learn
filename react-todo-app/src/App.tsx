import React, { useState, useEffect } from 'react';

interface Todo {
  id: number;
  text: string;
  completed: boolean;
  dueDate?: string; // 添加到期时间字段
}

const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>(() => {
    const savedTodos = localStorage.getItem('todos');
    return savedTodos ? JSON.parse(savedTodos) : [];
  });
  const [inputValue, setInputValue] = useState('');
  const [dueDateValue, setDueDateValue] = useState(''); // 新增到期时间输入状态
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [editDueDate, setEditDueDate] = useState(''); // 编辑时的到期时间
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'overdue'>('all');

  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos));
  }, [todos]);

  // 检查任务是否已过期
  const isOverdue = (dueDate?: string): boolean => {
    if (!dueDate) return false;
    const now = new Date();
    const due = new Date(dueDate);
    return due < now && !todos.find(t => t.dueDate === dueDate)?.completed;
  };

  const addTodo = () => {
    if (inputValue.trim() !== '') {
      const newTodo: Todo = {
        id: Date.now(),
        text: inputValue.trim(),
        completed: false,
        dueDate: dueDateValue || undefined
      };
      setTodos([...todos, newTodo]);
      setInputValue('');
      setDueDateValue('');
    }
  };

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id));
    if (editingId === id) {
      setEditingId(null);
    }
  };

  const toggleComplete = (id: number) => {
    setTodos(
      todos.map(todo =>
        todo.id === id ? { ...todo, completed: !todo.completed } : todo
      )
    );
  };

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
    setEditDueDate(todo.dueDate || '');
  };

  const saveEdit = (id: number) => {
    if (editText.trim() !== '') {
      const todoToEdit = todos.find(t => t.id === id);
      // 检查是否已过期，如果已过期则不允许编辑
      if (todoToEdit && isOverdue(todoToEdit.dueDate)) {
        return; // 已过期的任务不能编辑
      }
      
      setTodos(
        todos.map(todo =>
          todo.id === id 
            ? { ...todo, text: editText.trim(), dueDate: editDueDate || undefined } 
            : todo
        )
      );
    }
    setEditingId(null);
  };

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed;
    if (filter === 'completed') return todo.completed;
    if (filter === 'overdue') return isOverdue(todo.dueDate);
    return true;
  });

  const activeCount = todos.filter(todo => !todo.completed).length;
  const overdueCount = todos.filter(todo => isOverdue(todo.dueDate)).length;

  return (
    <div className="app">
      <div className="todo-container">
        <h1>React TodoList</h1>
        
        <div className="input-section">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addTodo()}
            placeholder="添加新任务..."
          />
          <input
            type="datetime-local"
            value={dueDateValue}
            onChange={(e) => setDueDateValue(e.target.value)}
            placeholder="到期时间"
          />
          <button onClick={addTodo}>添加</button>
        </div>

        <div className="filter-section">
          <button 
            className={filter === 'all' ? 'active' : ''}
            onClick={() => setFilter('all')}
          >
            全部
          </button>
          <button 
            className={filter === 'active' ? 'active' : ''}
            onClick={() => setFilter('active')}
          >
            进行中
          </button>
          <button 
            className={filter === 'completed' ? 'active' : ''}
            onClick={() => setFilter('completed')}
          >
            已完成
          </button>
          <button 
            className={filter === 'overdue' ? 'active' : ''}
            onClick={() => setFilter('overdue')}
          >
            已过期 ({overdueCount})
          </button>
        </div>

        <div className="stats">
          共 {todos.length} 项任务，{activeCount} 项进行中
        </div>

        <ul className="todo-list">
          {filteredTodos.map(todo => (
            <li 
              key={todo.id} 
              className={`todo-item ${todo.completed ? 'completed' : ''} ${isOverdue(todo.dueDate) ? 'overdue' : ''}`}
            >
              {editingId === todo.id && !isOverdue(todo.dueDate) ? (
                <div className="edit-form">
                  <input
                    type="text"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    autoFocus
                    onKeyPress={(e) => e.key === 'Enter' && saveEdit(todo.id)}
                  />
                  <input
                    type="datetime-local"
                    value={editDueDate}
                    onChange={(e) => setEditDueDate(e.target.value)}
                  />
                  <button onClick={() => saveEdit(todo.id)}>保存</button>
                  <button onClick={() => setEditingId(null)}>取消</button>
                </div>
              ) : (
                <div className="todo-content">
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleComplete(todo.id)}
                    disabled={isOverdue(todo.dueDate)} // 过期任务不能标记完成
                  />
                  <div className="todo-text-container">
                    <span className="todo-text">{todo.text}</span>
                    {todo.dueDate && (
                      <span className="due-date">
                        到期: {new Date(todo.dueDate).toLocaleString('zh-CN')}
                      </span>
                    )}
                  </div>
                  <div className="todo-actions">
                    {!isOverdue(todo.dueDate) && (
                      <button onClick={() => startEditing(todo)}>编辑</button>
                    )}
                    <button onClick={() => deleteTodo(todo.id)}>删除</button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default App;