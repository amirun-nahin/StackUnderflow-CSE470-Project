import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const navigate = useNavigate();

  // The Validation Rules (Yup)
  const validationSchema = Yup.object().shape({
    username: Yup.string().min(3, 'Username must be at least 3 characters').required('Username is required'),
    email: Yup.string().email('Invalid email address').required('Email is required'),
    password: Yup.string().min(6, 'Password must be at least 6 characters').required('Password is required'),
  });

  // The Submit Function (Fetch API)
  const onSubmit = async (data, { setSubmitting, setFieldError }) => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (response.ok) {
        navigate('/login');
      } else {
        setFieldError('email', result.error); 
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
      <h2>Join StackUnderflow</h2>
      
      <Formik
        initialValues={{ username: '', email: '', password: '' }}
        validationSchema={validationSchema}
        onSubmit={onSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="auth-form">
            <div className="input-group">
              <label>Username</label>
              <Field type="text" name="username" placeholder="Coder123" />
              <ErrorMessage name="username" component="span" className="error-text" />
            </div>

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
              {isSubmitting ? 'Registering...' : 'Register'}
            </button>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default Register;