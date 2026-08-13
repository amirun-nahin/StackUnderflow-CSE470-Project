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

      // 'result' holds the data coming back from the server (including the token)
      const result = await response.json();

      if (response.ok) {
        const actualToken = result.token || result.accessToken;

        if (!actualToken) {
          setFieldError("email", "Login succeeded, but no token was received.");
          return;
        }

        // Save the correct token
        localStorage.setItem("accessToken", actualToken);
        localStorage.setItem("username", result.username);

        // Force a hard browser reload so the Navbar updates instantly
        window.location.href = "/";
      } else {
        // Use Formik's built-in error handler instead of 'setError'
        setFieldError("email", result.error || "Login failed");
      }
    } catch (error) {
      console.error("Network error:", error);
      alert("Could not connect to the server.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-fullscreen">
      <div className="auth-showcase">
        <img src="logo.png" alt="StackUnderflow Logo" />
      </div>

      <div className="auth-form-zone">
        <div className="auth-form-content">
          <h2>Welcome back.</h2>
          <p className="auth-subtitle">&gt; Authenticate to continue</p>

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
                  <Field
                    type="password"
                    name="password"
                    placeholder="********"
                  />
                  <ErrorMessage
                    name="password"
                    component="span"
                    className="error-text"
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Logging in..." : "Login"}
                </button>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </div>
  );
};

export default Login;
