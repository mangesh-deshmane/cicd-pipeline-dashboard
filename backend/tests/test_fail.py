"""
Test file that intentionally fails to demonstrate failed builds on dashboard
"""

import pytest

def test_always_passes():
    """This test always passes"""
    assert True
    assert 1 + 1 == 2
    assert "hello" == "hello"

def test_sometimes_fails():
    """This test can be toggled to fail"""
    # Change this to False to make the test fail
    SHOULD_PASS = True
    
    if SHOULD_PASS:
        assert True
    else:
        assert False, "This test was configured to fail for demonstration"

def test_math_operations():
    """Test basic math operations"""
    assert 2 + 2 == 4
    assert 5 * 3 == 15
    assert 10 / 2 == 5

# Uncomment the test below to create a guaranteed failure
def test_intentional_failure():
    """This test always fails to demonstrate failure handling"""
    # Uncomment the line below to make this test fail
    assert False, "🚨 This is an intentional test failure for dashboard demonstration"

def test_division_by_zero():
    """Test that demonstrates exception handling"""
    try:
        result = 10 / 0
        assert False, "Should have raised ZeroDivisionError"
    except ZeroDivisionError:
        assert True  # This is expected

def test_string_operations():
    """Test string operations"""
    text = "Hello, World!"
    assert len(text) == 13
    assert text.upper() == "HELLO, WORLD!"
    assert "World" in text