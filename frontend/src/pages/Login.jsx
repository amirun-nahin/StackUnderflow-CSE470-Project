import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";

const Login = () => {
  const validationSchema = Yup.object().shape({
    email: Yup.string().email("Invalid email").required("Email is required"),
    password: Yup.string().required("Password is required"),
  });

  const onSubmit = async (values, { setSubmitting, setFieldError }) => {
    try {
      const response = await fetch("http://localhost:3001/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      // 'result' holds the data coming BACK from the server (including the token)
      const result = await response.json();

      if (response.ok) {
        const actualToken = result.token || result.accessToken;
        
        if (!actualToken) {
            setFieldError("email", "Login succeeded, but no token was received.");
            return;
        }

        // Save the correct token
        localStorage.setItem('accessToken', actualToken);
        localStorage.setItem('username', result.username);
        
        // Force a hard browser reload so the Navbar updates instantly
        window.location.href = '/'; 
      } else {
        // Use Formik's built-in error handler instead of 'setError'
        setFieldError("email", result.error || 'Login failed');
      }
            
    } catch (error) {
      console.error("Network error:", error);
      alert("Could not connect to the server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="form-container">
      <h2>Login to StackUnderflow</h2>

      <Formik
        initialValues={{ email: "", password: "" }}
        validationSchema={validationSchema}
        onSubmit={onSubmit}
      >
        {({ isSubmitting }) => (
          <Form className="auth-form">
            <div className="input-group">
              <label>Email</label>
              <Field
                type="email"
                name="email"
                placeholder="coder@example.com"
              />
              <ErrorMessage
                name="email"
                component="span"
                className="error-text"
              />
            </div>

            <div className="input-group">
              <label>Password</label>
              <Field type="password" name="password" placeholder="********" />
              <ErrorMessage
                name="password"
                component="span"
                className="error-text"
              />
            </div>

            <button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Logging in..." : "Login"}
            </button>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default Login;