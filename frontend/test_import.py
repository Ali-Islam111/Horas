try:
    from backend.main import app
    print('✓ App imported successfully')
except Exception as e:
    import traceback
    print("ERROR during import:")
    traceback.print_exc()
