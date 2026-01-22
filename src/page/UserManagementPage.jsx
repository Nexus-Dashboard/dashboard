"use client"

import { useState, useEffect } from "react"
import {
  Container,
  Row,
  Col,
  Card,
  Table,
  Button,
  Modal,
  Form,
  Alert,
  Badge,
  Spinner,
  InputGroup,
  Pagination,
} from "react-bootstrap"
import { Search, Plus, Edit, Trash2, Key, Eye, EyeOff, CheckCircle } from "lucide-react"
import { useAuth } from "../contexts/AuthContext"
import ApiBase from "../service/ApiBase"
import "./UserManagementPage.css"

const UserManagementPage = () => {
  const { user, isAdmin } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  // Estados para modais
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)

  // Estados para formulários
  const [selectedUser, setSelectedUser] = useState(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    role: "user",
    isActive: true,
  })
  const [newPassword, setNewPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // NOVOS ESTADOS: Para password no modal de criação
  const [createPassword, setCreatePassword] = useState("")
  const [showCreatePassword, setShowCreatePassword] = useState(false)

  // Estados para filtros e paginação
  const [searchTerm, setSearchTerm] = useState("")
  const [roleFilter, setRoleFilter] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)

  // Verificar se o usuário é admin
  useEffect(() => {
    if (!isAdmin()) {
      setError("Acesso negado. Apenas administradores podem acessar esta página.")
      return
    }
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, searchTerm, roleFilter])

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const params = {
        page: currentPage,
        limit: 10,
        search: searchTerm,
        role: roleFilter,
      }

      const response = await ApiBase.get("/api/users", { params })

      if (response.data.success) {
        setUsers(response.data.data.users)
        setTotalPages(response.data.data.pagination.totalPages)
        setTotalUsers(response.data.data.pagination.totalUsers)
      } else {
        setError("Erro ao carregar usuários")
      }
    } catch (err) {
      console.error("Erro ao buscar usuários:", err)
      setError("Erro ao carregar usuários")
    } finally {
      setLoading(false)
    }
  }

  // NOVA FUNÇÃO: Aprovar usuário
  const approveUser = async (userId) => {
    try {
      const response = await ApiBase.put(`/api/users/${userId}`, {
        role: "viewer", // Aprovar mudando de 'user' para 'viewer'
      })
      if (response.data.success) {
        setSuccess("Usuário aprovado com sucesso!")
        fetchUsers()
      }
    } catch (err) {
      setError(err.response?.data?.message || "Erro ao aprovar usuário")
    }
  }

  // NOVA FUNÇÃO: Contar usuários pendentes
  const getPendingUsersCount = () => {
    return users.filter(u => u.role === 'user').length
  }

  // FUNÇÃO ATUALIZADA: handleCreateUser com password
  const handleCreateUser = async (e) => {
    e.preventDefault()
    
    // Validação básica
    if (!createPassword || createPassword.length < 6) {
      setError("Senha deve ter pelo menos 6 caracteres")
      return
    }
    
    try {
      const requestData = {
        ...formData,
        password: createPassword, // Adicionar password
      }
      
      const response = await ApiBase.post("/api/auth/register", requestData)
      if (response.data.success) {
        setSuccess("Usuário criado com sucesso!")
        setShowCreateModal(false)
        resetForm()
        fetchUsers()
      }
    } catch (err) {
      setError(err.response?.data?.message || "Erro ao criar usuário")
    }
  }

  const handleUpdateUser = async (e) => {
    e.preventDefault()
    try {
      const response = await ApiBase.put(`/api/users/${selectedUser.id}`, formData)
      if (response.data.success) {
        setSuccess("Usuário atualizado com sucesso!")
        setShowEditModal(false)
        resetForm()
        fetchUsers()
      }
    } catch (err) {
      setError(err.response?.data?.message || "Erro ao atualizar usuário")
    }
  }

  const handleDeleteUser = async () => {
    try {
      const response = await ApiBase.delete(`/api/users/${selectedUser.id}`)
      if (response.data.success) {
        setSuccess("Usuário deletado com sucesso!")
        setShowDeleteModal(false)
        setSelectedUser(null)
        fetchUsers()
      }
    } catch (err) {
      setError(err.response?.data?.message || "Erro ao deletar usuário")
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    try {
      const response = await ApiBase.post(`/api/users/${selectedUser.id}/reset-password`, {
        newPassword,
      })
      if (response.data.success) {
        setSuccess("Senha resetada com sucesso!")
        setShowResetPasswordModal(false)
        setNewPassword("")
        setSelectedUser(null)
      }
    } catch (err) {
      setError(err.response?.data?.message || "Erro ao resetar senha")
    }
  }

  // FUNÇÃO ATUALIZADA: resetForm com password
  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      role: "user",
      isActive: true,
    })
    setCreatePassword("") // Limpar password
    setSelectedUser(null)
  }

  const openEditModal = (user) => {
    setSelectedUser(user)
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive,
    })
    setShowEditModal(true)
  }

  const openDeleteModal = (user) => {
    setSelectedUser(user)
    setShowDeleteModal(true)
  }

  const openResetPasswordModal = (user) => {
    setSelectedUser(user)
    setShowResetPasswordModal(true)
  }

  // FUNÇÃO ATUALIZADA: getRoleBadge mais clara
  const getRoleBadge = (role) => {
    const variants = {
      admin: { bg: "danger", text: "Admin" },
      viewer: { bg: "success", text: "Aprovado" },
      user: { bg: "warning", text: "Pendente" },
    }
    const config = variants[role] || { bg: "secondary", text: role }
    return <Badge bg={config.bg}>{config.text}</Badge>
  }

  const getStatusBadge = (isActive) => {
    return <Badge bg={isActive ? "success" : "secondary"}>{isActive ? "Ativo" : "Inativo"}</Badge>
  }

  if (!isAdmin()) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">Acesso negado. Apenas administradores podem acessar esta página.</Alert>
      </Container>
    )
  }

  return (
    <Container fluid className="user-management-page">
      <Row>
        <Col>
          <Card>
            {/* CABEÇALHO ATUALIZADO: Com contador de pendências */}
            <Card.Header>
              <Row className="align-items-center">
                <Col>
                  <h4 className="mb-0">Gerenciamento de Usuários</h4>
                  <small className="text">
                    Total: {totalUsers} usuários
                    {getPendingUsersCount() > 0 && (
                      <span className="ms-2">
                        • <Badge bg="warning">{getPendingUsersCount()} aguardando aprovação</Badge>
                      </span>
                    )}
                  </small>
                </Col>
                <Col xs="auto">
                  <Button variant="primary" onClick={() => setShowCreateModal(true)}>
                    <Plus size={16} className="me-2" />
                    Novo Usuário
                  </Button>
                </Col>
              </Row>
            </Card.Header>

            <Card.Body>
              {error && (
                <Alert variant="danger" onClose={() => setError("")} dismissible>
                  {error}
                </Alert>
              )}
              {success && (
                <Alert variant="success" onClose={() => setSuccess("")} dismissible>
                  {success}
                </Alert>
              )}

              {/* FILTROS ATUALIZADOS: Com botão de filtro rápido para pendentes */}
              <Row className="mb-3">
                <Col md={4}>
                  <InputGroup>
                    <InputGroup.Text>
                      <Search size={16} />
                    </InputGroup.Text>
                    <Form.Control
                      type="text"
                      placeholder="Buscar por nome ou email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </InputGroup>
                </Col>
                <Col md={3}>
                  <Form.Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                    <option value="">Todas as funções</option>
                    <option value="admin">Admin</option>
                    <option value="viewer">Viewer (Aprovados)</option>
                    <option value="user">User (Pendentes)</option>
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Button 
                    variant={roleFilter === 'user' ? 'warning' : 'outline-warning'}
                    onClick={() => setRoleFilter(roleFilter === 'user' ? '' : 'user')}
                    className="w-100"
                  >
                    {roleFilter === 'user' ? 'Mostrar Todos' : `Pendentes (${getPendingUsersCount()})`}
                  </Button>
                </Col>
              </Row>

              {/* Tabela de usuários */}
              {loading ? (
                <div className="text-center py-4">
                  <Spinner animation="border" />
                  <p className="mt-2">Carregando usuários...</p>
                </div>
              ) : (
                <>
                  <Table responsive striped hover>
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Email</th>
                        <th>Função</th>
                        <th>Status</th>
                        <th>Criado em</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((userItem) => (
                        <tr key={userItem.id}>
                          <td>{userItem.name}</td>
                          <td>{userItem.email}</td>
                          <td>{getRoleBadge(userItem.role)}</td>
                          <td>{getStatusBadge(userItem.isActive)}</td>
                          <td>{new Date(userItem.createdAt).toLocaleDateString("pt-BR")}</td>
                          <td>
                            {/* NOVO: Botão de Aprovar (só aparece para usuários pendentes) */}
                            {userItem.role === 'user' && (
                              <Button
                                variant="success"
                                size="sm"
                                className="me-2"
                                onClick={() => approveUser(userItem.id)}
                                title="Aprovar usuário"
                              >
                                <CheckCircle size={14} />
                              </Button>
                            )}
                            
                            {/* Botão Editar */}
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="me-2"
                              onClick={() => openEditModal(userItem)}
                              title="Editar usuário"
                            >
                              <Edit size={14} />
                            </Button>
                            
                            {/* Botão Reset Password */}
                            <Button
                              variant="outline-warning"
                              size="sm"
                              className="me-2"
                              onClick={() => openResetPasswordModal(userItem)}
                              title="Resetar senha"
                            >
                              <Key size={14} />
                            </Button>
                            
                            {/* Botão Deletar (não pode deletar a si mesmo) */}
                            {userItem.id !== user?.id && (
                              <Button 
                                variant="outline-danger" 
                                size="sm" 
                                onClick={() => openDeleteModal(userItem)}
                                title="Deletar usuário"
                              >
                                <Trash2 size={14} />
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>

                  {/* Paginação */}
                  {totalPages > 1 && (
                    <div className="d-flex justify-content-center">
                      <Pagination>
                        <Pagination.Prev disabled={currentPage === 1} onClick={() => setCurrentPage(currentPage - 1)} />
                        {[...Array(totalPages)].map((_, index) => (
                          <Pagination.Item
                            key={index + 1}
                            active={index + 1 === currentPage}
                            onClick={() => setCurrentPage(index + 1)}
                          >
                            {index + 1}
                          </Pagination.Item>
                        ))}
                        <Pagination.Next
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage(currentPage + 1)}
                        />
                      </Pagination>
                    </div>
                  )}
                </>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* MODAL CRIAR USUÁRIO ATUALIZADO: Com campo password */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Criar Novo Usuário</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleCreateUser}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nome</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </Form.Group>
            
            {/* NOVO: Campo Password */}
            <Form.Group className="mb-3">
              <Form.Label>Senha</Form.Label>
              <InputGroup>
                <Form.Control
                  type={showCreatePassword ? "text" : "password"}
                  value={createPassword}
                  onChange={(e) => setCreatePassword(e.target.value)}
                  placeholder="Digite a senha (mínimo 6 caracteres)"
                  required
                  minLength={6}
                />
                <Button 
                  variant="outline-secondary" 
                  onClick={() => setShowCreatePassword(!showCreatePassword)}
                >
                  {showCreatePassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </InputGroup>
              <Form.Text className="text-muted">
                A senha deve ter pelo menos 6 caracteres.
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Função</Form.Label>
              <Form.Select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                <option value="user">User (Aguardando Aprovação)</option>
                <option value="viewer">Viewer (Aprovado)</option>
                <option value="admin">Admin</option>
              </Form.Select>
              <Form.Text className="text-muted">
                Usuários com role 'user' precisam ser aprovados para acessar o sistema.
              </Form.Text>
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Usuário ativo"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Criar Usuário
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal Editar Usuário */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Editar Usuário</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleUpdateUser}>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Nome</Form.Label>
              <Form.Control
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Função</Form.Label>
              <Form.Select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                <option value="user">User (Pendente)</option>
                <option value="viewer">Viewer (Aprovado)</option>
                <option value="admin">Admin</option>
              </Form.Select>
              <Form.Text className="text-muted">
                Altere de 'User' para 'Viewer' para aprovar o acesso ao sistema.
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Check
                type="checkbox"
                label="Usuário ativo"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              Salvar Alterações
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* Modal Deletar Usuário */}
      <Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Exclusão</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            Tem certeza que deseja deletar o usuário <strong>{selectedUser?.name}</strong>?
          </p>
          <p className="text-danger">Esta ação não pode ser desfeita.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDeleteUser}>
            Deletar Usuário
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal Reset Password */}
      <Modal show={showResetPasswordModal} onHide={() => setShowResetPasswordModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Resetar Senha</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleResetPassword}>
          <Modal.Body>
            <p>
              Resetar senha para <strong>{selectedUser?.name}</strong>
            </p>
            <Form.Group className="mb-3">
              <Form.Label>Nova Senha</Form.Label>
              <InputGroup>
                <Form.Control
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Digite a nova senha"
                  required
                  minLength={6}
                />
                <Button variant="outline-secondary" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </Button>
              </InputGroup>
              <Form.Text className="text-muted">A senha deve ter pelo menos 6 caracteres.</Form.Text>
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowResetPasswordModal(false)}>
              Cancelar
            </Button>
            <Button variant="warning" type="submit">
              Resetar Senha
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  )
}

export default UserManagementPage