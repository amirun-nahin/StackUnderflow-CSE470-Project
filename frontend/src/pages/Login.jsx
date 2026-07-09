import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const navigate = useNavigate();

  const validationSchema = Yup.object().shape({
    email: Yup.string().email('Invalid email').required('Email is required'),
    password: Yup.string().required('Password is required'),
  });

  const onSubmit = async (data, { setSubmitting, setFieldError }) => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        // Save the JWT token to local storage
        localStorage.setItem('accessToken', result.token);
        localStorage.setItem('username', result.username);
        
        window.location.href = '/';
      } else {
        setFieldError('password', result.error);
      }
    } catch (error) {
      console.error('Network error:', error);
      alert('Could not connect to the server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Login to StackUnderflow</h2>
      
      <Formik
        initialValues={{ email: '', password: '' }}
        validationSchema={validationSchema}
        onSubmit={onSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="auth-form">
            <div className="input-group">
              <label>Email</label>
              <Field type="email" name="email" placeholder="coder@example.com" />
              <ErrorMessage name="email" component="span" className="error-text" />
            </div>

            <div className="input-group">
              <label>Password</label>
              <Field type="password" name="password" placeholder="********" />
              <ErrorMessage name="password" component="span" className="error-text" />
            </div>

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Logging in...' : 'Login'}
            </button>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default Login;