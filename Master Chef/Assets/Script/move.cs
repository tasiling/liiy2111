using UnityEngine;
using System.Collections;

public class move : MonoBehaviour {


	public float speed=1;
	public Animator animator;
	public GameObject myfood;
	private Rigidbody myfoodrb;

	// Use this for initialization
	void Start () {
		speed = 1;
		animator = GetComponent<Animator> ();
		animator.SetBool ("attackable", true);
		animator.SetBool ("moveable", true);
	}

	// Update is called once per frame
	void Update () {

		//移動旋轉
		if (animator.GetBool ("moveable") == true) {
			if (Input.GetKey (KeyCode.LeftArrow)) {
				transform.Translate (new Vector3 (-0.1f * speed, 0, 0), Space.World);
				transform.rotation = Quaternion.Euler (new Vector3 (0, -90, 0));
			}
			if (Input.GetKey (KeyCode.RightArrow)) {
				transform.Translate (new Vector3 (0.1f * speed, 0, 0), Space.World);
				transform.rotation = Quaternion.Euler (new Vector3 (0, 90, 0));
			}
			if (Input.GetKey (KeyCode.UpArrow)) {
				transform.Translate (new Vector3 (0, 0, 0.1f * speed), Space.World);
				transform.rotation = Quaternion.Euler (new Vector3 (0, 0, 0));
			}
			if (Input.GetKey (KeyCode.DownArrow)) {
				transform.Translate (new Vector3 (0, 0, -0.1f * speed), Space.World);
				transform.rotation = Quaternion.Euler (new Vector3 (0, 180, 0));
			}

			if (Input.GetKey (KeyCode.UpArrow) && Input.GetKey (KeyCode.LeftArrow))
				transform.rotation = Quaternion.Euler (new Vector3 (0, -45, 0));
			else if (Input.GetKey (KeyCode.UpArrow) && Input.GetKey (KeyCode.RightArrow))
				transform.rotation = Quaternion.Euler (new Vector3 (0, 45, 0));
			else if (Input.GetKey (KeyCode.LeftArrow) && Input.GetKey (KeyCode.DownArrow))
				transform.rotation = Quaternion.Euler (new Vector3 (0, -135, 0));
			else if (Input.GetKey (KeyCode.RightArrow) && Input.GetKey (KeyCode.DownArrow))
				transform.rotation = Quaternion.Euler (new Vector3 (0, 135, 0));

			if (Input.GetKey (KeyCode.UpArrow) || Input.GetKey (KeyCode.LeftArrow) || Input.GetKey (KeyCode.DownArrow) || Input.GetKey (KeyCode.RightArrow)) {
				animator.SetBool ("moveing", true);
			} else {
				animator.SetBool ("moveing", false);
			}
		}

		//攻擊與放下物品
		if(Input.GetKeyDown(KeyCode.Space)){
			if (animator.GetBool ("attackable") == true) {
				animator.SetBool ("attack", true);
			} else {
//				myfood = GameObject.FindWithTag ("food");
				myfood.transform.parent = null;
//				myfood.AddComponent <Rigidbody>();
				myfoodrb = myfood.GetComponent<Rigidbody> ();
				myfoodrb.AddForce (new Vector3 (100, 30, 0));
				animator.SetBool ("attackable", true);
			}
		}




	}

	void OnTriggerEnter(Collider foodonground){
		if (animator.GetBool ("attackable") == true) {
			if (foodonground.CompareTag ("food")) {
				foodonground.transform.parent = gameObject.transform;
				foodonground.transform.localPosition = new Vector3 (0, 2, 0);
//				myfood = gameObject.transform.FindChild ("food");
				myfood = GameObject.FindWithTag ("food");
/*				for(int i=0;i<=food.Length;i++){
					if (gameObject.transform.FindChild ("food[i]").gameObject){
						myfood = food [i];
						Debug.Log ("i");
//						myfood=gameObject.transform.GetChild(food[i]).gameObject;
					}
				}*/
				animator.SetBool ("attackable", false);
//				Destroy(myfood.GetComponent<Rigidbody>());
			}
		}
	}

}
